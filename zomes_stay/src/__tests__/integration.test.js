// Frontend Integration Tests for Travel Agent Signup
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AgentSignupModal from '../components/AgentSignupModal';

// Mock the API service
jest.mock('../services/property/agent/authService', () => ({
  register: jest.fn()
}));

import { travelAgentAuthService } from '../services/property/agent/authService';

describe('Travel Agent Signup Integration Tests', () => {
  const mockOnClose = jest.fn();
  const mockOnSwitchToLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should complete successful registration flow', async () => {
    // Mock successful API response
    travelAgentAuthService.register.mockResolvedValue({
      data: {
        success: true,
        message: 'Account created successfully!',
        data: {
          agent: {
            id: '123',
            email: 'test@example.com',
            status: 'pending'
          }
        }
      }
    });

    render(
      <AgentSignupModal
        isOpen={true}
        onClose={mockOnClose}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    );

    // Fill out the form
    await userEvent.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/phone number/i), '+1234567890');
    await userEvent.type(screen.getByLabelText(/first name/i), 'John');
    await userEvent.type(screen.getByLabelText(/last name/i), 'Doe');
    await userEvent.type(screen.getByLabelText(/agency name/i), 'Test Agency');
    await userEvent.type(screen.getByLabelText(/license number/i), 'LIC123');
    await userEvent.type(screen.getByLabelText(/password/i), 'TestPass123');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'TestPass123');
    await userEvent.type(screen.getByLabelText(/office address/i), '123 Test Street, Test City');

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    // Wait for API call
    await waitFor(() => {
      expect(travelAgentAuthService.register).toHaveBeenCalledWith(
        expect.any(FormData)
      );
    });

    // Verify success modal appears
    await waitFor(() => {
      expect(screen.getByText(/success!/i)).toBeInTheDocument();
      expect(screen.getByText(/account created successfully/i)).toBeInTheDocument();
    });

    // Verify form is reset
    expect(screen.getByLabelText(/email address/i)).toHaveValue('');
    expect(screen.getByLabelText(/phone number/i)).toHaveValue('');
  });

  it('should handle API error gracefully', async () => {
    // Mock API error response
    travelAgentAuthService.register.mockRejectedValue({
      response: {
        data: {
          success: false,
          message: 'You already have an account with this email. Please login instead.'
        }
      }
    });

    render(
      <AgentSignupModal
        isOpen={true}
        onClose={mockOnClose}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    );

    // Fill out the form
    await userEvent.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/phone number/i), '+1234567890');
    await userEvent.type(screen.getByLabelText(/password/i), 'TestPass123');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'TestPass123');
    await userEvent.type(screen.getByLabelText(/office address/i), '123 Test Street');

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    // Wait for error modal
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
      expect(screen.getByText(/you already have an account with this email/i)).toBeInTheDocument();
    });
  });

  it('should validate form fields before submission', async () => {
    render(
      <AgentSignupModal
        isOpen={true}
        onClose={mockOnClose}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    );

    // Try to submit empty form
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    // Check for validation errors
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/phone number is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    expect(screen.getByText(/office address is required/i)).toBeInTheDocument();

    // API should not be called
    expect(travelAgentAuthService.register).not.toHaveBeenCalled();
  });

  it('should handle file upload integration', async () => {
    // Mock successful API response
    travelAgentAuthService.register.mockResolvedValue({
      data: {
        success: true,
        message: 'Account created successfully!'
      }
    });

    render(
      <AgentSignupModal
        isOpen={true}
        onClose={mockOnClose}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    );

    // Fill out required fields
    await userEvent.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/phone number/i), '+1234567890');
    await userEvent.type(screen.getByLabelText(/password/i), 'TestPass123');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'TestPass123');
    await userEvent.type(screen.getByLabelText(/office address/i), '123 Test Street');

    // Create a test file
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText(/iata certificate/i);
    
    // Upload file
    await userEvent.upload(fileInput, file);

    // Verify file is selected
    expect(screen.getByText(/test\.pdf/i)).toBeInTheDocument();

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    // Wait for API call
    await waitFor(() => {
      expect(travelAgentAuthService.register).toHaveBeenCalledWith(
        expect.any(FormData)
      );
    });

    // Verify FormData contains the file
    const formDataCall = travelAgentAuthService.register.mock.calls[0][0];
    expect(formDataCall.get('iataCertificate')).toBe(file);
  });

  it('should clear errors when user starts typing', async () => {
    render(
      <AgentSignupModal
        isOpen={true}
        onClose={mockOnClose}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    );

    // Submit empty form to trigger errors
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    // Check error appears
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();

    // Start typing in email field
    await userEvent.type(screen.getByLabelText(/email address/i), 'test@example.com');

    // Error should be cleared
    expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument();
  });

  it('should handle password visibility toggle', async () => {
    render(
      <AgentSignupModal
        isOpen={true}
        onClose={mockOnClose}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    );

    const passwordInput = screen.getByLabelText(/password/i);
    const toggleButton = screen.getByRole('button', { name: /show password/i });

    // Password should be hidden by default
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Click toggle button
    fireEvent.click(toggleButton);

    // Password should be visible
    expect(passwordInput).toHaveAttribute('type', 'text');

    // Click toggle button again
    fireEvent.click(toggleButton);

    // Password should be hidden again
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
