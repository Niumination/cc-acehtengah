import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InputForm from './InputForm';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() },),
  useSearchParams: () => new URLSearchParams(),
}));

describe('InputForm', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('renders form with all fields', () => {
    render(<InputForm onSubmit={mockOnSubmit} />);
    
    expect(screen.getByLabelText(/judul laporan/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/opd/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/indikator/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/deskripsi/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /simpan laporan/i })).toBeInTheDocument();
  });

  it('starts with button disabled (form not filled)', () => {
    render(<InputForm onSubmit={mockOnSubmit} />);
    const submitButton = screen.getByRole('button', { name: /simpan laporan/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables button when data is valid and form is dirty', async () => {
    render(<InputForm onSubmit={mockOnSubmit} />);
    
    // Fill required fields
    fireEvent.change(screen.getByLabelText(/judul laporan/i), { target: { value: 'Laporan Stunting Q1' } });
    fireEvent.change(screen.getByLabelText(/opd/i), { target: { value: 'dinkes' } });
    fireEvent.change(screen.getByLabelText(/indikator/i), { target: { value: 'stunting' } });
    
    const submitButton = screen.getByRole('button', { name: /simpan laporan/i });
    await waitFor(() => expect(submitButton).not.toBeDisabled());
  });

  it('submits form when button is clicked', async () => {
    render(<InputForm onSubmit={mockOnSubmit} />);
    
    fireEvent.change(screen.getByLabelText(/judul laporan/i), { target: { value: 'Laporan Test' } });
    fireEvent.change(screen.getByLabelText(/opd/i), { target: { value: 'dinkes' } });
    fireEvent.change(screen.getByLabelText(/indikator/i), { target: { value: 'stunting' } });
    
    const submitButton = screen.getByRole('button', { name: /simpan laporan/i });
    await waitFor(() => expect(submitButton).not.toBeDisabled());
    
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        judul: 'Laporan Test',
        opd: 'dinkes',
        indikator: 'stunting',
        deskripsi: '',
      });
    });
  });

  it('shows loading state during submission', async () => {
    mockOnSubmit.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(<InputForm onSubmit={mockOnSubmit} />);
    
    fireEvent.change(screen.getByLabelText(/judul laporan/i), { target: { value: 'Laporan Test' } });
    fireEvent.change(screen.getByLabelText(/opd/i), { target: { value: 'dinkes' } });
    fireEvent.change(screen.getByLabelText(/indikator/i), { target: { value: 'stunting' } });
    
    fireEvent.click(screen.getByRole('button', { name: /simpan laporan/i }));
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /menyimpan/i })).toBeInTheDocument();
    });
  });
});
