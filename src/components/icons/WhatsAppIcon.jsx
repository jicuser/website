import React from 'react';
import { FaWhatsapp } from 'react-icons/fa';

export default function WhatsAppIcon({ size = 20, ...props }) {
  return <FaWhatsapp size={size} aria-hidden="true" focusable="false" {...props}/>;
}
