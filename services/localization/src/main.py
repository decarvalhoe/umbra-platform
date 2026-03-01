"""umbra-localization-service - Service d'internationalisation et traductions."""

from __future__ import annotations

import json
import os
from pathlib import Path
from flask import Flask, jsonify
from flask_cors import CORS


BASE_DIR = Path(__file__).resolve().parent.parent
TRANSLATIONS_FILE = BASE_DIR / 'data' / 'translations.json'


def load_translations() -> dict[str, dict[str, str]]:
    """Load translations from the JSON file shipped with the project."""

    if not TRANSLATIONS_FILE.exists():  # pragma: no cover - guardrail
        raise FileNotFoundError(f'Translations file missing at {TRANSLATIONS_FILE}')

    with TRANSLATIONS_FILE.open('r', encoding='utf-8') as handle:
        return json.load(handle)


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app)

    # Configuration
    app.config['DEBUG'] = os.getenv('FLASK_DEBUG', '0') == '1'
    app.config['TRANSLATIONS'] = load_translations()

    # Health check endpoint
    @app.route('/health')
    def health():
        return jsonify({
            'success': True,
            'data': {
                'status': 'healthy',
                'service': 'umbra-localization-service'
            },
            'message': 'Service en bonne santé',
            'error': None,
            'meta': None
        }), 200

    @app.route('/locales')
    def locales():
        translations = app.config['TRANSLATIONS']
        locales_list = sorted(translations.keys())
        return jsonify({
            'success': True,
            'data': {
                'locales': locales_list
            },
            'message': 'Locales disponibles récupérées',
            'error': None,
            'meta': {
                'count': len(locales_list)
            }
        }), 200

    @app.route('/translations/<locale>')
    def translations_for_locale(locale: str):
        translations = app.config['TRANSLATIONS']
        locale_data = translations.get(locale)
        if locale_data is None:
            return jsonify({
                'success': False,
                'data': None,
                'message': f'Locale "{locale}" inconnue',
                'error': 'locale_not_found',
                'meta': None
            }), 404

        return jsonify({
            'success': True,
            'data': {
                'locale': locale,
                'translations': locale_data
            },
            'message': 'Traductions récupérées',
            'error': None,
            'meta': {
                'count': len(locale_data)
            }
        }), 200

    @app.route('/translations/<locale>/<key>')
    def translation_by_key(locale: str, key: str):
        translations = app.config['TRANSLATIONS']
        locale_data = translations.get(locale)
        if locale_data is None:
            return jsonify({
                'success': False,
                'data': None,
                'message': f'Locale "{locale}" inconnue',
                'error': 'locale_not_found',
                'meta': None
            }), 404

        value = locale_data.get(key)
        if value is None:
            return jsonify({
                'success': False,
                'data': None,
                'message': f'Clé "{key}" introuvable pour la locale {locale}',
                'error': 'key_not_found',
                'meta': None
            }), 404

        return jsonify({
            'success': True,
            'data': {
                'locale': locale,
                'key': key,
                'value': value
            },
            'message': 'Traduction récupérée',
            'error': None,
            'meta': None
        }), 200

    return app


if __name__ == '__main__':
    app = create_app()
    port = int(os.getenv('PORT', '5007'))
    app.run(host='0.0.0.0', port=port, debug=True)
