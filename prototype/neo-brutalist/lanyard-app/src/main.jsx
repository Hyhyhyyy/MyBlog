import React from 'react';
import { createRoot } from 'react-dom/client';
import Lanyard from './Lanyard.jsx';
import './Lanyard.css';

const root = document.getElementById('lanyard-root');
if (root) {
  createRoot(root).render(
    <Lanyard position={[0, 0, 18]} gravity={[0, -40, 0]} fov={22} />
  );
}
