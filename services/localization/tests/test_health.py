"""Tests pour l'endpoint de santé du service."""


def test_health_endpoint(client):
    """Test de l'endpoint /health."""
    response = client.get('/health')
    
    assert response.status_code == 200
    
    data = response.get_json()
    assert data['success'] is True
    assert data['data']['status'] == 'healthy'
    assert data['data']['service'] == 'umbra-localization-service'
    assert 'Service en bonne santé' in data['message']
