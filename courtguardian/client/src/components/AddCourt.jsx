import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { getToken } from '../api';
import { ALLOWED_SPORTS, API_BASE_URL } from '../constants';

export default function AddCourt({ onSuccess, defaultSport }) {
  const [show, setShow] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    lat: '',
    lng: '',
    surface_type: '',
    lighting: false,
    court_count: 1,
    sport_type: defaultSport || 'pickleball',
  });
  const [error, setError] = useState(null);
  const open = () => setShow(true);
  const close = () => setShow(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (isNaN(parseFloat(formData.lat)) || isNaN(parseFloat(formData.lng))) {
      setError('Latitude and Longitude must be valid numbers');
      return;
    }

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/courts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          lat: parseFloat(formData.lat),
          lng: parseFloat(formData.lng),
          court_count: formData.court_count ? parseInt(formData.court_count) : null,
          sport_type: formData.sport_type.toLowerCase(),
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'Failed to add court');
      }

      setFormData({
        name: '',
        address: '',
        lat: '',
        lng: '',
        surface_type: '',
        lighting: false,
        court_count: 1,
        sport_type: defaultSport || 'pickleball',
      });
      close();
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <Button className="mb-3" onClick={open}>Add a New Court</Button>

      <Modal show={show} onHide={close}>
        <Modal.Header closeButton><Modal.Title>Add Court</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Sport *</Form.Label>
              <Form.Select name="sport_type" value={formData.sport_type} onChange={handleChange} required>
                {ALLOWED_SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Name *</Form.Label>
              <Form.Control name="name" value={formData.name} onChange={handleChange} required />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Address</Form.Label>
              <Form.Control as="textarea" rows={2} name="address" value={formData.address} onChange={handleChange} />
            </Form.Group>

            <div className="row">
              <div className="col-md-6 mb-3">
                <Form.Label>Latitude *</Form.Label>
                <Form.Control type="number" step="any" name="lat" value={formData.lat} onChange={handleChange} required />
              </div>
              <div className="col-md-6 mb-3">
                <Form.Label>Longitude *</Form.Label>
                <Form.Control type="number" step="any" name="lng" value={formData.lng} onChange={handleChange} required />
              </div>
            </div>

            <Form.Group className="mb-3">
              <Form.Label>Surface Type</Form.Label>
              <Form.Control name="surface_type" value={formData.surface_type} onChange={handleChange} />
            </Form.Group>

            <Form.Check className="mb-3" type="checkbox" label="Lighting Available" name="lighting" checked={formData.lighting} onChange={handleChange} />

            <Form.Group className="mb-3">
              <Form.Label>Number of Courts</Form.Label>
              <Form.Control type="number" name="court_count" value={formData.court_count} min="1" onChange={handleChange} />
            </Form.Group>

            {error && <div className="alert alert-danger">{error}</div>}
            <Button type="submit" variant="success">Add Court</Button>
          </Form>
        </Modal.Body>
      </Modal>
    </>
  );
}