-- Script d'initialisation des bases de données pour tous les services

-- Service d'authentification
CREATE DATABASE umbra_auth;
CREATE USER umbra_auth WITH PASSWORD 'dev_password';
GRANT ALL PRIVILEGES ON DATABASE umbra_auth TO umbra_auth;

-- Service de joueurs
CREATE DATABASE umbra_player;
CREATE USER umbra_player WITH PASSWORD 'dev_password';
GRANT ALL PRIVILEGES ON DATABASE umbra_player TO umbra_player;

-- Service d'état de jeu
CREATE DATABASE umbra_game;
CREATE USER umbra_game WITH PASSWORD 'dev_password';
GRANT ALL PRIVILEGES ON DATABASE umbra_game TO umbra_game;

-- Service de paiement
CREATE DATABASE umbra_payment;
CREATE USER umbra_payment WITH PASSWORD 'dev_password';
GRANT ALL PRIVILEGES ON DATABASE umbra_payment TO umbra_payment;

-- Service de profils cloud
CREATE DATABASE umbra_cloud;
CREATE USER umbra_cloud WITH PASSWORD 'dev_password';
GRANT ALL PRIVILEGES ON DATABASE umbra_cloud TO umbra_cloud;

-- Service de sécurité
CREATE DATABASE umbra_security;
CREATE USER umbra_security WITH PASSWORD 'dev_password';
GRANT ALL PRIVILEGES ON DATABASE umbra_security TO umbra_security;

-- Service de localisation
CREATE DATABASE umbra_i18n;
CREATE USER umbra_i18n WITH PASSWORD 'dev_password';
GRANT ALL PRIVILEGES ON DATABASE umbra_i18n TO umbra_i18n;
