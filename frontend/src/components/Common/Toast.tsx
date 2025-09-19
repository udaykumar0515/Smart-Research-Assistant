import React from 'react';
import { Toaster } from 'react-hot-toast';

export function Toast() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: '#1F3A93',
          color: 'white',
          fontWeight: '500'
        },
        success: {
          style: {
            background: '#1ABC9C',
          },
        },
      }}
    />
  );
}