"""Tests for translation related endpoints."""

def test_list_locales_endpoint(client):
    response = client.get('/locales')
    assert response.status_code == 200

    data = response.get_json()
    assert data['success'] is True
    assert 'locales' in data['data']
    assert data['data']['locales'] == sorted(data['data']['locales'])
    assert data['meta']['count'] == len(data['data']['locales'])


def test_translations_for_known_locale(client):
    response = client.get('/translations/en')
    assert response.status_code == 200

    data = response.get_json()
    assert data['success'] is True
    assert data['data']['locale'] == 'en'
    assert 'greeting' in data['data']['translations']


def test_translations_for_unknown_locale(client):
    response = client.get('/translations/it')
    assert response.status_code == 404

    data = response.get_json()
    assert data['success'] is False
    assert data['error'] == 'locale_not_found'


def test_translation_by_key(client):
    response = client.get('/translations/fr/thanks')
    assert response.status_code == 200

    data = response.get_json()
    assert data['data']['value'] == 'Merci'
    assert data['data']['key'] == 'thanks'


def test_translation_by_key_missing_key(client):
    response = client.get('/translations/fr/unknown-key')
    assert response.status_code == 404

    data = response.get_json()
    assert data['error'] == 'key_not_found'
