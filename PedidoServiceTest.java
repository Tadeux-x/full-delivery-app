package com.comandadigital.service;

import com.comandadigital.exception.EstoqueInsuficienteException;
import com.comandadigital.model.*;
import com.comandadigital.model.enums.*;
import com.comandadigital.repository.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PedidoService — Fluxo de Status e Estoque")
class PedidoServiceTest {

    @InjectMocks private PedidoService service;
    @Mock private PedidoRepository pedidoRepository;
    @Mock private PratoRepository pratoRepository;
    @Mock private IngredienteRepository ingredienteRepository;
    @Mock private FichaTecnicaRepository fichaTecnicaRepository;
    @Mock private MovimentacaoEstoqueRepository movimentacaoRepository;
    @Mock private UsuarioRepository usuarioRepository;

    private Pedido pedidoRecebido;
    private Ingrediente ingrediente;

    @BeforeEach
    void setUp() {
        ingrediente = Ingrediente.builder()
            .id(1L).nome("Carne").unidadeMedida("un")
            .custoUnitario(BigDecimal.TEN)
            .quantidadeEstoque(new BigDecimal("50"))
            .estoqueMinimo(new BigDecimal("5"))
            .build();

        Prato prato = Prato.builder().id(1L).nome("Burger")
            .precoVenda(new BigDecimal("32.90"))
            .status(StatusGeral.ATIVO).disponivel(true).build();

        ItemPedido item = ItemPedido.builder()
            .prato(prato).quantidade(2)
            .precoUnitario(new BigDecimal("32.90"))
            .subtotal(new BigDecimal("65.80"))
            .status(StatusGeral.ATIVO).build();

        Usuario usuario = Usuario.builder().id(1L).nome("Teste")
            .email("t@t.com").perfil(PerfilUsuario.CLIENTE).build();

        pedidoRecebido = Pedido.builder()
            .id(1L).numeroPedido("PED-20240101-00001")
            .usuario(usuario)
            .statusPedido(StatusPedido.RECEBIDO)
            .statusPagamento(StatusPagamento.APROVADO)
            .formaPagamento(FormaPagamento.PIX)
            .tipoEntrega(TipoEntrega.ENTREGA)
            .subtotal(new BigDecimal("65.80"))
            .taxaEntrega(new BigDecimal("5.00"))
            .total(new BigDecimal("70.80"))
            .status(StatusGeral.ATIVO)
            .itens(new java.util.ArrayList<>(List.of(item)))
            .build();
    }

    @Test
    @DisplayName("Deve avançar status de RECEBIDO para CONFIRMADO e baixar estoque")
    void deveAvancarParaConfirmadoEBaixarEstoque() {
        FichaTecnica ft = FichaTecnica.builder()
            .ingrediente(ingrediente)
            .quantidade(new BigDecimal("1.0000"))
            .fatorCorrecao(BigDecimal.ONE)
            .rendimento(BigDecimal.ONE)
            .build();

        when(pedidoRepository.findById(1L)).thenReturn(Optional.of(pedidoRecebido));
        when(fichaTecnicaRepository.findAtivasByPratoId(1L)).thenReturn(List.of(ft));
        when(ingredienteRepository.save(any())).thenReturn(ingrediente);
        when(movimentacaoRepository.save(any())).thenReturn(null);
        when(pedidoRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        var response = service.avancarStatus(1L);

        assertThat(response.statusPedido()).isEqualTo(StatusPedido.CONFIRMADO);
        // Estoque deve ter sido baixado: 50 - (1 × 1 × 2 itens) = 48
        assertThat(ingrediente.getQuantidadeEstoque()).isEqualByComparingTo(new BigDecimal("48"));
    }

    @Test
    @DisplayName("Deve lançar EstoqueInsuficienteException quando estoque insuficiente")
    void deveLancarExcecaoEstoqueInsuficiente() {
        ingrediente.setQuantidadeEstoque(new BigDecimal("0.5")); // Insuficiente

        FichaTecnica ft = FichaTecnica.builder()
            .ingrediente(ingrediente)
            .quantidade(new BigDecimal("2.0000"))
            .fatorCorrecao(BigDecimal.ONE)
            .rendimento(BigDecimal.ONE)
            .build();

        when(pedidoRepository.findById(1L)).thenReturn(Optional.of(pedidoRecebido));
        when(fichaTecnicaRepository.findAtivasByPratoId(1L)).thenReturn(List.of(ft));

        assertThatThrownBy(() -> service.avancarStatus(1L))
            .isInstanceOf(EstoqueInsuficienteException.class)
            .hasMessageContaining("Estoque insuficiente");
    }

    @Test
    @DisplayName("Não deve avançar pedido ENTREGUE")
    void naoDeveAvancarPedidoEntregue() {
        pedidoRecebido.setStatusPedido(StatusPedido.ENTREGUE);
        when(pedidoRepository.findById(1L)).thenReturn(Optional.of(pedidoRecebido));

        assertThatThrownBy(() -> service.avancarStatus(1L))
            .isInstanceOf(com.comandadigital.exception.RegraDeNegocioException.class);
    }
}
