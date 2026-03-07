package com.comandadigital.service;

import com.comandadigital.dto.request.FichaTecnicaRequest;
import com.comandadigital.dto.request.ItemFichaTecnicaRequest;
import com.comandadigital.dto.response.FichaTecnicaResponse;
import com.comandadigital.dto.response.ItemFichaTecnicaResponse;
import com.comandadigital.exception.RecursoNaoEncontradoException;
import com.comandadigital.model.FichaTecnica;
import com.comandadigital.model.Ingrediente;
import com.comandadigital.model.Prato;
import com.comandadigital.model.enums.StatusGeral;
import com.comandadigital.repository.FichaTecnicaRepository;
import com.comandadigital.repository.IngredienteRepository;
import com.comandadigital.repository.PratoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Serviço responsável pela Ficha Técnica dos pratos.
 *
 * FÓRMULA DE CUSTO (por item):
 *   custo_item = (quantidade × fator_correcao × custo_unitario_ingrediente) / rendimento
 *
 * CUSTO TOTAL DO PRATO:
 *   custo_prato = Σ(custo_item) para todos ingredientes ativos da ficha
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FichaTecnicaService {

    private final FichaTecnicaRepository fichaTecnicaRepository;
    private final PratoRepository pratoRepository;
    private final IngredienteRepository ingredienteRepository;

    // ─── Consulta ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public FichaTecnicaResponse buscarPorPrato(Long pratoId) {
        Prato prato = buscarPratoOuErro(pratoId);
        List<FichaTecnica> fichas = fichaTecnicaRepository.findAtivasByPratoId(pratoId);

        return montarResponse(prato, fichas);
    }

    // ─── Salvar / Atualizar ficha completa ───────────────────────────────────

    @Transactional
    public FichaTecnicaResponse salvarFicha(FichaTecnicaRequest request) {
        Prato prato = buscarPratoOuErro(request.pratoId());

        // Remove itens existentes (estratégia: substituição total)
        fichaTecnicaRepository.deleteByPratoId(prato.getId());
        fichaTecnicaRepository.flush();

        // Cria novos itens
        List<FichaTecnica> novoItens = request.itens().stream()
            .map(itemReq -> criarItemFicha(prato, itemReq))
            .toList();

        fichaTecnicaRepository.saveAll(novoItens);

        // Recalcula e persiste custo no prato
        BigDecimal custoTotal = calcularCustoTotal(novoItens);
        prato.setCustoCalculado(custoTotal);
        pratoRepository.save(prato);

        log.info("Ficha técnica atualizada — Prato: {} | Custo: {}", prato.getNome(), custoTotal);

        return montarResponse(prato, novoItens);
    }

    // ─── Cálculo de Custo ────────────────────────────────────────────────────

    /**
     * Recalcula o custo de um prato a partir de sua ficha técnica atual.
     * Atualiza o campo custo_calculado na tabela prato.
     */
    @Transactional
    public BigDecimal recalcularCustoPrato(Long pratoId) {
        Prato prato = buscarPratoOuErro(pratoId);
        List<FichaTecnica> fichas = fichaTecnicaRepository.findAtivasByPratoId(pratoId);

        BigDecimal custoTotal = calcularCustoTotal(fichas);
        prato.setCustoCalculado(custoTotal);
        pratoRepository.save(prato);

        log.debug("Custo recalculado — Prato ID {}: R$ {}", pratoId, custoTotal);
        return custoTotal;
    }

    /**
     * Custo total = Σ [ (qtd × fator_correcao × custo_unitario) / rendimento ]
     */
    public BigDecimal calcularCustoTotal(List<FichaTecnica> fichas) {
        return fichas.stream()
            .filter(ft -> ft.getStatus() == StatusGeral.ATIVO)
            .map(FichaTecnica::calcularCusto)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(4, RoundingMode.HALF_UP);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private FichaTecnica criarItemFicha(Prato prato, ItemFichaTecnicaRequest req) {
        Ingrediente ingrediente = ingredienteRepository.findById(req.ingredienteId())
            .filter(i -> i.getStatus() == StatusGeral.ATIVO)
            .orElseThrow(() -> new RecursoNaoEncontradoException(
                "Ingrediente não encontrado: " + req.ingredienteId()
            ));

        return FichaTecnica.builder()
            .prato(prato)
            .ingrediente(ingrediente)
            .quantidade(req.quantidade())
            .fatorCorrecao(req.fatorCorrecao())
            .rendimento(req.rendimento())
            .build();
    }

    private FichaTecnicaResponse montarResponse(Prato prato, List<FichaTecnica> fichas) {
        BigDecimal custoTotal = calcularCustoTotal(fichas);

        BigDecimal margemLucro = BigDecimal.ZERO;
        if (custoTotal.compareTo(BigDecimal.ZERO) > 0) {
            margemLucro = prato.getPrecoVenda()
                .subtract(custoTotal)
                .divide(prato.getPrecoVenda(), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));
        }

        List<ItemFichaTecnicaResponse> itens = fichas.stream()
            .map(ft -> new ItemFichaTecnicaResponse(
                ft.getId(),
                ft.getIngrediente().getId(),
                ft.getIngrediente().getNome(),
                ft.getIngrediente().getUnidadeMedida(),
                ft.getQuantidade(),
                ft.getFatorCorrecao(),
                ft.getRendimento(),
                ft.calcularCusto()
            ))
            .toList();

        return new FichaTecnicaResponse(
            prato.getId(),
            prato.getNome(),
            custoTotal,
            prato.getPrecoVenda(),
            margemLucro,
            itens
        );
    }

    private Prato buscarPratoOuErro(Long pratoId) {
        return pratoRepository.findById(pratoId)
            .filter(p -> p.getStatus() == StatusGeral.ATIVO)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Prato não encontrado: " + pratoId));
    }
}
