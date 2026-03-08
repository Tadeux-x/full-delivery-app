package com.comandadigital.service;

import com.comandadigital.dto.request.PratoRequest;
import com.comandadigital.dto.response.PratoResponse;
import com.comandadigital.exception.RecursoNaoEncontradoException;
import com.comandadigital.exception.RegraDeNegocioException;
import com.comandadigital.model.Categoria;
import com.comandadigital.model.Prato;
import com.comandadigital.model.enums.StatusGeral;
import com.comandadigital.repository.CategoriaRepository;
import com.comandadigital.repository.PratoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class PratoService {

    private final PratoRepository pratoRepository;
    private final CategoriaRepository categoriaRepository;
    private final FichaTecnicaService fichaTecnicaService;

    @Transactional(readOnly = true)
    public Page<PratoResponse> listarAtivos(Pageable pageable) {
        return pratoRepository.findByStatusAndDisponivelTrue(StatusGeral.ATIVO, pageable)
            .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<PratoResponse> listarTodos(Pageable pageable) {
        return pratoRepository.findAll(pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public PratoResponse buscarPorId(Long id) {
        return toResponse(buscarOuErro(id));
    }

    @Transactional
    public PratoResponse criar(PratoRequest request) {
        Categoria cat = categoriaRepository.findById(request.categoriaId())
            .filter(c -> c.getStatus() == StatusGeral.ATIVO)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Categoria não encontrada: " + request.categoriaId()));

        Prato prato = Prato.builder()
            .categoria(cat)
            .nome(request.nome())
            .descricao(request.descricao())
            .precoVenda(request.precoVenda())
            .imagemUrl(request.imagemUrl())
            .disponivel(request.disponivel() != null ? request.disponivel() : true)
            .build();

        Prato salvo = pratoRepository.save(prato);
        log.info("Prato criado: {} (id={})", salvo.getNome(), salvo.getId());
        return toResponse(salvo);
    }

    @Transactional
    public PratoResponse atualizar(Long id, PratoRequest request) {
        Prato prato = buscarOuErro(id);

        Categoria cat = categoriaRepository.findById(request.categoriaId())
            .filter(c -> c.getStatus() == StatusGeral.ATIVO)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Categoria não encontrada"));

        prato.setCategoria(cat);
        prato.setNome(request.nome());
        prato.setDescricao(request.descricao());
        prato.setPrecoVenda(request.precoVenda());
        prato.setImagemUrl(request.imagemUrl());
        if (request.disponivel() != null) prato.setDisponivel(request.disponivel());

        // Recalcula custo se ficha técnica existir
        fichaTecnicaService.recalcularCustoPrato(id);

        return toResponse(pratoRepository.save(prato));
    }

    @Transactional
    public PratoResponse alternarDisponibilidade(Long id) {
        Prato prato = buscarOuErro(id);
        prato.setDisponivel(!prato.getDisponivel());
        return toResponse(pratoRepository.save(prato));
    }

    @Transactional
    public void inativar(Long id) {
        Prato prato = buscarOuErro(id);
        prato.setStatus(StatusGeral.INATIVO);
        prato.setDisponivel(false);
        pratoRepository.save(prato);
        log.info("Prato inativado (soft delete): id={}", id);
    }

    private Prato buscarOuErro(Long id) {
        return pratoRepository.findById(id)
            .filter(p -> p.getStatus() == StatusGeral.ATIVO)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Prato não encontrado: " + id));
    }

    public PratoResponse toResponse(Prato p) {
        return new PratoResponse(
            p.getId(), p.getCategoria().getId(), p.getCategoria().getNome(),
            p.getNome(), p.getDescricao(), p.getPrecoVenda(),
            p.getCustoCalculado(), p.getImagemUrl(), p.getDisponivel()
        );
    }
}
