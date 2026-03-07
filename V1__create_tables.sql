-- ============================================================
-- Comanda Digital - V1__create_tables.sql
-- Flyway Migration - Schema Inicial
-- ============================================================

-- Tabela: usuario
CREATE TABLE usuario (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    nome          VARCHAR(150)        NOT NULL,
    email         VARCHAR(150)        NOT NULL UNIQUE,
    senha         VARCHAR(255)        NOT NULL,
    perfil        ENUM('ADMIN','COZINHA','ENTREGADOR','CLIENTE') NOT NULL DEFAULT 'CLIENTE',
    status        ENUM('ATIVO','INATIVO') NOT NULL DEFAULT 'ATIVO',
    criado_em     DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela: categoria
CREATE TABLE categoria (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    nome          VARCHAR(100)        NOT NULL,
    descricao     VARCHAR(255),
    status        ENUM('ATIVO','INATIVO') NOT NULL DEFAULT 'ATIVO',
    criado_em     DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela: ingrediente (estoque)
CREATE TABLE ingrediente (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    nome              VARCHAR(150)        NOT NULL,
    unidade_medida    VARCHAR(30)         NOT NULL COMMENT 'kg, g, L, mL, un',
    custo_unitario    DECIMAL(10,4)       NOT NULL DEFAULT 0.0000,
    quantidade_estoque DECIMAL(12,4)      NOT NULL DEFAULT 0.0000,
    estoque_minimo    DECIMAL(12,4)       NOT NULL DEFAULT 0.0000,
    status            ENUM('ATIVO','INATIVO') NOT NULL DEFAULT 'ATIVO',
    criado_em         DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em     DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela: prato
CREATE TABLE prato (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    categoria_id    BIGINT              NOT NULL,
    nome            VARCHAR(150)        NOT NULL,
    descricao       TEXT,
    preco_venda     DECIMAL(10,2)       NOT NULL DEFAULT 0.00,
    custo_calculado DECIMAL(10,4)       NOT NULL DEFAULT 0.0000 COMMENT 'Custo calculado via ficha técnica',
    imagem_url      VARCHAR(500),
    disponivel      TINYINT(1)          NOT NULL DEFAULT 1,
    status          ENUM('ATIVO','INATIVO') NOT NULL DEFAULT 'ATIVO',
    criado_em       DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em   DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_prato_categoria FOREIGN KEY (categoria_id) REFERENCES categoria(id)
);

-- Tabela: ficha_tecnica (itens da ficha técnica de cada prato)
-- Custo = SUM(quantidade * fator_correcao * custo_unitario) / rendimento
CREATE TABLE ficha_tecnica (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    prato_id        BIGINT              NOT NULL,
    ingrediente_id  BIGINT              NOT NULL,
    quantidade      DECIMAL(12,4)       NOT NULL COMMENT 'Quantidade bruta do ingrediente',
    fator_correcao  DECIMAL(6,4)        NOT NULL DEFAULT 1.0000 COMMENT 'Fator de correção (ex: 1.15 = 15% de perda)',
    rendimento      DECIMAL(6,4)        NOT NULL DEFAULT 1.0000 COMMENT 'Rendimento da receita (ex: 0.90 = 90%)',
    status          ENUM('ATIVO','INATIVO') NOT NULL DEFAULT 'ATIVO',
    criado_em       DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em   DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ft_prato       FOREIGN KEY (prato_id)       REFERENCES prato(id),
    CONSTRAINT fk_ft_ingrediente FOREIGN KEY (ingrediente_id) REFERENCES ingrediente(id),
    CONSTRAINT uq_ft_prato_ingrediente UNIQUE (prato_id, ingrediente_id)
);

-- Tabela: pedido
CREATE TABLE pedido (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id          BIGINT              NOT NULL,
    numero_pedido       VARCHAR(20)         NOT NULL UNIQUE,
    status_pedido       ENUM('RECEBIDO','CONFIRMADO','EM_PREPARO','PRONTO','SAIU_ENTREGA','ENTREGUE','CANCELADO')
                                            NOT NULL DEFAULT 'RECEBIDO',
    tipo_entrega        ENUM('ENTREGA','RETIRADA') NOT NULL DEFAULT 'ENTREGA',
    endereco_entrega    TEXT,
    subtotal            DECIMAL(10,2)       NOT NULL DEFAULT 0.00,
    taxa_entrega        DECIMAL(10,2)       NOT NULL DEFAULT 0.00,
    total               DECIMAL(10,2)       NOT NULL DEFAULT 0.00,
    forma_pagamento     ENUM('PIX','CARTAO_CREDITO','CARTAO_DEBITO','DINHEIRO') NOT NULL,
    status_pagamento    ENUM('PENDENTE','APROVADO','RECUSADO') NOT NULL DEFAULT 'PENDENTE',
    observacao          TEXT,
    status              ENUM('ATIVO','INATIVO') NOT NULL DEFAULT 'ATIVO',
    criado_em           DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em       DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pedido_usuario FOREIGN KEY (usuario_id) REFERENCES usuario(id)
);

-- Tabela: item_pedido
CREATE TABLE item_pedido (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    pedido_id       BIGINT              NOT NULL,
    prato_id        BIGINT              NOT NULL,
    quantidade      INT                 NOT NULL DEFAULT 1,
    preco_unitario  DECIMAL(10,2)       NOT NULL,
    subtotal        DECIMAL(10,2)       NOT NULL,
    observacao      VARCHAR(255),
    status          ENUM('ATIVO','INATIVO') NOT NULL DEFAULT 'ATIVO',
    criado_em       DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_item_pedido  FOREIGN KEY (pedido_id) REFERENCES pedido(id),
    CONSTRAINT fk_item_prato   FOREIGN KEY (prato_id)  REFERENCES prato(id)
);

-- Tabela: movimentacao_estoque (auditoria de baixas/entradas)
CREATE TABLE movimentacao_estoque (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    ingrediente_id  BIGINT              NOT NULL,
    pedido_id       BIGINT,
    tipo            ENUM('ENTRADA','SAIDA','AJUSTE') NOT NULL,
    quantidade      DECIMAL(12,4)       NOT NULL,
    saldo_anterior  DECIMAL(12,4)       NOT NULL,
    saldo_posterior DECIMAL(12,4)       NOT NULL,
    motivo          VARCHAR(255),
    criado_em       DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mov_ingrediente FOREIGN KEY (ingrediente_id) REFERENCES ingrediente(id),
    CONSTRAINT fk_mov_pedido      FOREIGN KEY (pedido_id)      REFERENCES pedido(id)
);

-- ============================================================
-- Índices de Performance
-- ============================================================
CREATE INDEX idx_pedido_status    ON pedido(status_pedido);
CREATE INDEX idx_pedido_usuario   ON pedido(usuario_id);
CREATE INDEX idx_pedido_criado_em ON pedido(criado_em);
CREATE INDEX idx_item_pedido      ON item_pedido(pedido_id);
CREATE INDEX idx_ft_prato         ON ficha_tecnica(prato_id);
CREATE INDEX idx_mov_ingrediente  ON movimentacao_estoque(ingrediente_id);
CREATE INDEX idx_prato_categoria  ON prato(categoria_id);
CREATE INDEX idx_prato_disponivel ON prato(disponivel, status);
