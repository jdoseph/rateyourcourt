import React from 'react';
import { ALLOWED_SPORTS } from '../constants';

export default function SportFilter({ value, onChange }) {
  return (
    <ul className="nav nav-pills mb-3">
      <li className="nav-item">
        <button
          className={`nav-link ${!value ? 'active' : ''}`}
          onClick={() => onChange(null)}
        >
          All
        </button>
      </li>
      {ALLOWED_SPORTS.map(s => (
        <li key={s} className="nav-item">
          <button
            className={`nav-link text-capitalize ${value === s ? 'active' : ''}`}
            onClick={() => onChange(s)}
          >
            {s}
          </button>
        </li>
      ))}
    </ul>
  );
}
