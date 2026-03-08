package com.comandadigital.service;

import com.comandadigital.dto.request.UsuarioRequest;
import com.comandadigital.dto.response.UsuarioResponse;
import com.comandadigital.exception.RecursoNaoEncontradoException;
import com.comandadigital.exception.RegraDeNegocioException;
import com.comandadigital.model.Usuario;
import com.comandadigital.model.enums.PerfilUsuario;
import com.comandadigital.model.enums.StatusGeral;
import com.comandadigital.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<UsuarioResponse> listarTodos() {
        return usuarioRepository.findAll().stream()
            .filter(u -> u.getStatus() == StatusGeral.ATIVO)
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public UsuarioResponse buscarPorId(Long id) {
        return toResponse(buscarOuErro(id));
    }

    /**
     * Registro público: apenas perfil CLIENTE.
     * Senha codificada com BCrypt antes de persistir.
     */
    @Transactional
    public UsuarioResponse registrar(UsuarioRequest request) {
        if (usuarioRepository.existsByEmail(request.email())) {
            throw new RegraDeNegocioException("E-mail já cadastrado: " + request.email());
        }

        Usuario usuario = Usuario.builder()
            .nome(request.nome())
            .email(request.email())
            .senha(passwordEncoder.encode(request.senha())) // BCrypt — NUNCA em plain text
            .perfil(PerfilUsuario.CLIENTE)
            .build();

        Usuario salvo = usuarioRepository.save(usuario);
        log.info("Novo usuário registrado: {} ({})", salvo.getEmail(), salvo.getPerfil());
        return toResponse(salvo);
    }

    /**
     * Criação de usuário admin (apenas ADMIN pode chamar este método).
     */
    @Transactional
    public UsuarioResponse criarUsuarioAdmin(UsuarioRequest request) {
        if (usuarioRepository.existsByEmail(request.email())) {
            throw new RegraDeNegocioException("E-mail já cadastrado: " + request.email());
        }

        PerfilUsuario perfil = request.perfil() != null ? request.perfil() : PerfilUsuario.CLIENTE;

        Usuario usuario = Usuario.builder()
            .nome(request.nome())
            .email(request.email())
            .senha(passwordEncoder.encode(request.senha()))
            .perfil(perfil)
            .build();

        return toResponse(usuarioRepository.save(usuario));
    }

    @Transactional
    public void inativar(Long id) {
        Usuario usuario = buscarOuErro(id);
        usuario.setStatus(StatusGeral.INATIVO);
        usuarioRepository.save(usuario);
        log.info("Usuário inativado (soft delete): id={}", id);
    }

    private Usuario buscarOuErro(Long id) {
        return usuarioRepository.findById(id)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado: " + id));
    }

    private UsuarioResponse toResponse(Usuario u) {
        // Senha NÃO é incluída na resposta
        return new UsuarioResponse(u.getId(), u.getNome(), u.getEmail(),
            u.getPerfil(), u.getStatus(), u.getCriadoEm());
    }
}
