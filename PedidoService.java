package com.comandadigital.service;

import com.comandadigital.dto.request.ItemPedidoRequest;
import com.comandadigital.dto.request.PedidoRequest;
import com.comandadigital.dto.response.ItemPedidoResponse;
import com.comandadigital.dto.response.PedidoResponse;
import com.comandadigital.exception.EstoqueInsuficienteException;
import com.comandadigital.exception.RecursoNaoEncontradoException;
import com.comandadigital.exception.RegraDeNegocioException;
import com.comandadigital.model.*;
import com.comandadigital.model.enums.*;
import com.comandadigital.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Serviço de Pedidos — orquestra todo o ciclo de vida do pedido.
 *
 * Fluxo de Status:
 *   RECEBIDO → CONFIRMADO → EM_PREPARO → PRONTO → SAIU_ENTREGA → ENTREGUE
 *                                                               ↘ CANCELADO
 *
 * Ao CONFIRMAR: baixa automática no estoque conforme ficha técnica de cada prato.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PedidoService {

    private static final BigDecimal TAXA_ENTREGA = new BigDecimal("5.00");
    private static final AtomicLong SEQUENCIAL = new AtomicLong(1);

    private final PedidoRepository pedidoRepository;
    private final PratoRepository pratoRepository;
    private final IngredienteRepository ingredienteRepository;
    private final FichaTecnicaRepository fichaTecnicaRepository;
    private final MovimentacaoEstoqueRepository movimentacaoRepository;
    private final UsuarioRepository usuarioRepository;

    // ─── Criar Pedido ────────────────────────────────────────────────────────

    @Transactional
    public PedidoResponse criarPedido(PedidoRequest request, Long usuarioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado"));

        Pedido pedido = Pedido.builder()
            .usuario(usuario)
            .numeroPedido(gerarNumeroPedido())
            .tipoEntrega(request.tipoEntrega())
            .enderecoEntrega(request.enderecoEntrega())
            .formaPagamento(request.formaPagamento())
            .observacao(request.observacao())
            .taxaEntrega(request.tipoEntrega() == TipoEntrega.ENTREGA ? TAXA_ENTREGA : BigDecimal.ZERO)
            .build();

        // Adiciona itens
        for (ItemPedidoRequest itemReq : request.itens()) {
            Prato prato = pratoRepository.findById(itemReq.pratoId())
                .filter(p -> p.getStatus() == StatusGeral.ATIVO && p.getDisponivel())
                .orElseThrow(() -> new RegraDeNegocioException(
                    "Prato indisponível: " + itemReq.pratoId()
                ));

            ItemPedido item = ItemPedido.builder()
                .prato(prato)
                .quantidade(itemReq.quantidade())
                .precoUnitario(prato.getPrecoVenda())
                .subtotal(prato.getPrecoVenda().multiply(BigDecimal.valueOf(itemReq.quantidade())))
                .observacao(itemReq.observacao())
                .build();

            pedido.adicionarItem(item);
        }

        pedido.recalcularTotais();

        // Pagamento simulado: PIX e DINHEIRO aprovam na hora
        if (request.formaPagamento() == FormaPagamento.PIX
                || request.formaPagamento() == FormaPagamento.DINHEIRO) {
            pedido.setStatusPagamento(StatusPagamento.APROVADO);
        }

        Pedido salvo = pedidoRepository.save(pedido);
        log.info("Pedido criado — Nº {} | Total: R$ {} | Cliente: {}",
            salvo.getNumeroPedido(), salvo.getTotal(), usuario.getEmail());

        return toResponse(salvo);
    }

    // ─── Avançar Status ──────────────────────────────────────────────────────

    @Transactional
    public PedidoResponse avancarStatus(Long pedidoId) {
        Pedido pedido = buscarPedidoOuErro(pedidoId);
        StatusPedido statusAtual = pedido.getStatusPedido();

        StatusPedido proximo = switch (statusAtual) {
            case RECEBIDO     -> StatusPedido.CONFIRMADO;
            case CONFIRMADO   -> StatusPedido.EM_PREPARO;
            case EM_PREPARO   -> StatusPedido.PRONTO;
            case PRONTO       -> StatusPedido.SAIU_ENTREGA;
            case SAIU_ENTREGA -> StatusPedido.ENTREGUE;
            default -> throw new RegraDeNegocioException(
                "Pedido com status '" + statusAtual + "' não pode ser avançado."
            );
        };

        // ── Baixa de estoque ao CONFIRMAR ─────────────────────────────────
        if (proximo == StatusPedido.CONFIRMADO) {
            validarPagamentoAprovado(pedido);
            realizarBaixaEstoque(pedido);
        }

        pedido.setStatusPedido(proximo);
        Pedido atualizado = pedidoRepository.save(pedido);

        log.info("Pedido Nº {} — {} → {}", pedido.getNumeroPedido(), statusAtual, proximo);
        return toResponse(atualizado);
    }

    // ─── Cancelar Pedido ─────────────────────────────────────────────────────

    @Transactional
    public PedidoResponse cancelarPedido(Long pedidoId, String motivo) {
        Pedido pedido = buscarPedidoOuErro(pedidoId);

        if (pedido.getStatusPedido() == StatusPedido.ENTREGUE) {
            throw new RegraDeNegocioException("Pedido já entregue não pode ser cancelado.");
        }
        if (pedido.getStatusPedido() == StatusPedido.CANCELADO) {
            throw new RegraDeNegocioException("Pedido já está cancelado.");
        }

        // Estorno de estoque se pedido já estava CONFIRMADO
        boolean deveEstornar = pedido.getStatusPedido() != StatusPedido.RECEBIDO;
        pedido.setStatusPedido(StatusPedido.CANCELADO);
        pedido.setObservacao("CANCELADO: " + motivo);

        if (deveEstornar) {
            estornarEstoque(pedido, "Cancelamento: " + motivo);
        }

        Pedido atualizado = pedidoRepository.save(pedido);
        log.info("Pedido Nº {} CANCELADO. Motivo: {}", pedido.getNumeroPedido(), motivo);
        return toResponse(atualizado);
    }

    // ─── Consultas ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<PedidoResponse> listarPorStatus(StatusPedido statusPedido, Pageable pageable) {
        return pedidoRepository
            .findByStatusPedidoAndStatusOrderByCriadoEmDesc(statusPedido, StatusGeral.ATIVO, pageable)
            .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<PedidoResponse> listarDoUsuario(Long usuarioId, Pageable pageable) {
        return pedidoRepository
            .findByUsuarioIdAndStatusOrderByCriadoEmDesc(usuarioId, StatusGeral.ATIVO, pageable)
            .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public PedidoResponse buscarPorNumero(String numeroPedido) {
        return pedidoRepository.findByNumeroPedido(numeroPedido)
            .map(this::toResponse)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Pedido não encontrado: " + numeroPedido));
    }

    // ─── Baixa de Estoque ────────────────────────────────────────────────────

    /**
     * Para cada item do pedido, busca a ficha técnica do prato e
     * desconta do estoque: qtd_ingrediente = ft.quantidade × ft.fator_correcao × qtd_pedido
     */
    private void realizarBaixaEstoque(Pedido pedido) {
        for (ItemPedido item : pedido.getItens()) {
            List<FichaTecnica> ficha = fichaTecnicaRepository
                .findAtivasByPratoId(item.getPrato().getId());

            for (FichaTecnica ft : ficha) {
                BigDecimal qtdNecessaria = ft.getQuantidade()
                    .multiply(ft.getFatorCorrecao())
                    .multiply(BigDecimal.valueOf(item.getQuantidade()));

                Ingrediente ing = ft.getIngrediente();
                BigDecimal saldoAnterior = ing.getQuantidadeEstoque();

                try {
                    ing.baixarEstoque(qtdNecessaria);
                } catch (IllegalStateException e) {
                    throw new EstoqueInsuficienteException(e.getMessage());
                }

                ingredienteRepository.save(ing);
                registrarMovimentacao(ing, pedido, TipoMovimentacao.SAIDA,
                    qtdNecessaria, saldoAnterior, ing.getQuantidadeEstoque(),
                    "Pedido Nº " + pedido.getNumeroPedido());
            }
        }
    }

    private void estornarEstoque(Pedido pedido, String motivo) {
        for (ItemPedido item : pedido.getItens()) {
            fichaTecnicaRepository.findAtivasByPratoId(item.getPrato().getId())
                .forEach(ft -> {
                    BigDecimal qtd = ft.getQuantidade()
                        .multiply(ft.getFatorCorrecao())
                        .multiply(BigDecimal.valueOf(item.getQuantidade()));

                    Ingrediente ing = ft.getIngrediente();
                    BigDecimal saldoAnterior = ing.getQuantidadeEstoque();
                    ing.adicionarEstoque(qtd);
                    ingredienteRepository.save(ing);

                    registrarMovimentacao(ing, pedido, TipoMovimentacao.ENTRADA,
                        qtd, saldoAnterior, ing.getQuantidadeEstoque(), "Estorno — " + motivo);
                });
        }
    }

    private void registrarMovimentacao(Ingrediente ing, Pedido pedido,
                                        TipoMovimentacao tipo, BigDecimal qtd,
                                        BigDecimal anterior, BigDecimal posterior, String motivo) {
        movimentacaoRepository.save(MovimentacaoEstoque.builder()
            .ingrediente(ing)
            .pedido(pedido)
            .tipo(tipo)
            .quantidade(qtd)
            .saldoAnterior(anterior)
            .saldoPosterior(posterior)
            .motivo(motivo)
            .build());
    }

    // ─── Utilitários ─────────────────────────────────────────────────────────

    private void validarPagamentoAprovado(Pedido pedido) {
        if (pedido.getStatusPagamento() != StatusPagamento.APROVADO) {
            throw new RegraDeNegocioException(
                "Pedido não pode ser confirmado: pagamento com status " + pedido.getStatusPagamento()
            );
        }
    }

    private Pedido buscarPedidoOuErro(Long id) {
        return pedidoRepository.findById(id)
            .filter(p -> p.getStatus() == StatusGeral.ATIVO)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Pedido não encontrado: " + id));
    }

    private String gerarNumeroPedido() {
        String data = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        return "PED-" + data + "-" + String.format("%05d", SEQUENCIAL.getAndIncrement());
    }

    // ─── Response Mapper ─────────────────────────────────────────────────────

    private PedidoResponse toResponse(Pedido p) {
        List<ItemPedidoResponse> itens = p.getItens().stream()
            .filter(i -> i.getStatus() == StatusGeral.ATIVO)
            .map(i -> new ItemPedidoResponse(
                i.getId(),
                i.getPrato().getId(),
                i.getPrato().getNome(),
                i.getPrato().getImagemUrl(),
                i.getQuantidade(),
                i.getPrecoUnitario(),
                i.getSubtotal(),
                i.getObservacao()
            ))
            .toList();

        return new PedidoResponse(
            p.getId(), p.getNumeroPedido(), p.getStatusPedido(),
            p.getTipoEntrega(), p.getEnderecoEntrega(),
            p.getSubtotal(), p.getTaxaEntrega(), p.getTotal(),
            p.getFormaPagamento(), p.getStatusPagamento(),
            p.getObservacao(), itens,
            p.getCriadoEm(), p.getAtualizadoEm()
        );
    }
}
