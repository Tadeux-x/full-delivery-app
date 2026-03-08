-- ============================================================
-- Comanda Digital - V1__create_tables.sql (VERSÃO POSTGRESQL)
-- ============================================================

-- Tabela: usuario
CREATE TABLE usuario (
    id            BIGSERIAL PRIMARY KEY,
    nome          VARCHAR(150)        NOT NULL,
    email         VARCHAR(150)        NOT NULL UNIQUE,
    senha         VARCHAR(255)        NOT NULL,
    perfil        VARCHAR(20)         NOT NULL DEFAULT 'CLIENTE',
    status        VARCHAR(20)         NOT NULL DEFAULT 'ATIVO',
    criado_em     TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: categoria
CREATE TABLE categoria (
    id            BIGSERIAL PRIMARY KEY,
    nome          VARCHAR(100)        NOT NULL,
    descricao     VARCHAR(255),
    status        VARCHAR(20)         NOT NULL DEFAULT 'ATIVO',
    criado_em     TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: ingrediente
CREATE TABLE ingrediente (
    id                BIGSERIAL PRIMARY KEY,
    nome              VARCHAR(150)        NOT NULL,
    unidade_medida    VARCHAR(30)         NOT NULL,
    custo_unitario    DECIMAL(10,4)       NOT NULL DEFAULT 0.0000,
    quantidade_estoque DECIMAL(12,4)      NOT NULL DEFAULT 0.0000,
    estoque_minimo    DECIMAL(12,4)       NOT NULL DEFAULT 0.0000,
    status            VARCHAR(20)         NOT NULL DEFAULT 'ATIVO',
    criado_em         TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em     TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: prato
CREATE TABLE prato (
    id              BIGSERIAL PRIMARY KEY,
    categoria_id    BIGINT              NOT NULL,
    nome            VARCHAR(150)        NOT NULL,
    descricao       TEXT,
    preco_venda     DECIMAL(10,2)       NOT NULL DEFAULT 0.00,
    custo_calculado DECIMAL(10,4)       NOT NULL DEFAULT 0.0000,
    imagem_url      VARCHAR(500),
    disponivel      BOOLEAN             NOT NULL DEFAULT TRUE,
    status          VARCHAR(20)         NOT NULL DEFAULT 'ATIVO',
    criado_em       TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em   TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_prato_categoria FOREIGN KEY (categoria_id) REFERENCES categoria(id)
);

-- Tabela: ficha_tecnica
CREATE TABLE ficha_tecnica (
    id              BIGSERIAL PRIMARY KEY,
    prato_id        BIGINT              NOT NULL,
    ingrediente_id  BIGINT              NOT NULL,
    quantidade      DECIMAL(12,4)       NOT NULL,
    fator_correcao  DECIMAL(6,4)        NOT NULL DEFAULT 1.0000,
    rendimento      DECIMAL(6,4)        NOT NULL DEFAULT 1.0000,
    status          VARCHAR(20)         NOT NULL DEFAULT 'ATIVO',
    criado_em       TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em   TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ft_prato       FOREIGN KEY (prato_id)       REFERENCES prato(id),
    CONSTRAINT fk_ft_ingrediente FOREIGN KEY (ingrediente_id) REFERENCES ingrediente(id),
    CONSTRAINT uq_ft_prato_ingrediente UNIQUE (prato_id, ingrediente_id)
);

-- Tabela: pedido
CREATE TABLE pedido (
    id                  BIGSERIAL PRIMARY KEY,
    usuario_id          BIGINT              NOT NULL,
    numero_pedido       VARCHAR(20)         NOT NULL UNIQUE,
    status_pedido       VARCHAR(30)         NOT NULL DEFAULT 'RECEBIDO',
    tipo_entrega        VARCHAR(20)         NOT NULL DEFAULT 'ENTREGA',
    endereco_entrega    TEXT,
    subtotal            DECIMAL(10,2)       NOT NULL DEFAULT 0.00,
    taxa_entrega        DECIMAL(10,2)       NOT NULL DEFAULT 0.00,
    total               DECIMAL(10,2)       NOT NULL DEFAULT 0.00,
    forma_pagamento     VARCHAR(30)         NOT NULL,
    status_pagamento    VARCHAR(30)         NOT NULL DEFAULT 'PENDENTE',
    observacao          TEXT,
    status              VARCHAR(20)         NOT NULL DEFAULT 'ATIVO',
    criado_em           TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em       TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pedido_usuario FOREIGN KEY (usuario_id) REFERENCES usuario(id)
);

-- Tabela: item_pedido
CREATE TABLE item_pedido (
    id              BIGSERIAL PRIMARY KEY,
    pedido_id       BIGINT              NOT NULL,
    prato_id        BIGINT              NOT NULL,
    quantidade      INT                 NOT NULL DEFAULT 1,
    preco_unitario  DECIMAL(10,2)       NOT NULL,
    subtotal        DECIMAL(10,2)       NOT NULL,
    observacao      VARCHAR(255),
    status          VARCHAR(20)         NOT NULL DEFAULT 'ATIVO',
    criado_em       TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_item_pedido  FOREIGN KEY (pedido_id) REFERENCES pedido(id),
    CONSTRAINT fk_item_prato   FOREIGN KEY (prato_id)  REFERENCES prato(id)
);

-- Tabela: movimentacao_estoque
CREATE TABLE movimentacao_estoque (
    id              BIGSERIAL PRIMARY KEY,
    ingrediente_id  BIGINT              NOT NULL,
    pedido_id       BIGINT,
    tipo            VARCHAR(20)         NOT NULL,
    quantidade      DECIMAL(12,4)       NOT NULL,
    saldo_anterior  DECIMAL(12,4)       NOT NULL,
    saldo_posterior DECIMAL(12,4)       NOT NULL,
    motivo          VARCHAR(255),
    criado_em       TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mov_ingrediente FOREIGN KEY (ingrediente_id) REFERENCES ingrediente(id),
    CONSTRAINT fk_mov_pedido      FOREIGN KEY (pedido_id)      REFERENCES pedido(id)
);

-- Índices
CREATE INDEX idx_pedido_status    ON pedido(status_pedido);
CREATE INDEX idx_pedido_usuario   ON pedido(usuario_id);
CREATE INDEX idx_item_pedido      ON item_pedido(pedido_id);
CREATE INDEX idx_ft_prato         ON ficha_tecnica(prato_id);
CREATE INDEX idx_prato_categoria  ON prato(categoria_id);