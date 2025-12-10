import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';

import { Button } from '../components/ui/Button';

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Click</Button>);
    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading spinner when loading', () => {
    render(<Button loading>Loading</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    // Check for spinner (CircleNotch icon has animate-spin class)
    expect(button.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies variant classes correctly', () => {
    const { rerender } = render(<Button variant="default">Default</Button>);
    let button = screen.getByRole('button');
    expect(button).toHaveClass('from-primary');

    rerender(<Button variant="destructive">Destructive</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('bg-red-500');

    rerender(<Button variant="outline">Outline</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('border-white/10');

    rerender(<Button variant="ghost">Ghost</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('hover:bg-white/5');
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<Button size="default">Default</Button>);
    let button = screen.getByRole('button');
    expect(button).toHaveClass('h-10');

    rerender(<Button size="sm">Small</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('h-9');

    rerender(<Button size="lg">Large</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('h-11');

    rerender(<Button size="icon">Icon</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('w-10');
  });

  it('merges custom className with variant classes', () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
    expect(button).toHaveClass('from-primary'); // default variant
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('passes through HTML button attributes', () => {
    render(
      <Button type="submit" name="submit-btn" data-testid="custom-id">
        Submit
      </Button>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toHaveAttribute('name', 'submit-btn');
    expect(button).toHaveAttribute('data-testid', 'custom-id');
  });
});
