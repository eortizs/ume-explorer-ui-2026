import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EntityNotFound } from '@/components/EntityNotFound';

describe('EntityNotFound', () => {
  it('renders a friendly isolation panel and short id preview', () => {
    const id = '0190a3c2-b001-7000-8000-000000000000';
    render(<EntityNotFound id={id} />);
    expect(screen.getByTestId('entity-not-found')).toBeInTheDocument();
    expect(screen.getByText(/404/)).toBeInTheDocument();
    expect(screen.getByText('0190a3c2…')).toBeInTheDocument();
  });
});