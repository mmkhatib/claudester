import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../card';

describe('Card Components', () => {
  describe('Card', () => {
    it('renders correctly', () => {
      const { container } = render(<Card>Card Content</Card>);
      expect(container.firstChild).toBeInTheDocument();
      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<Card className="custom-card">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('custom-card');
    });
  });

  describe('CardHeader', () => {
    it('renders correctly', () => {
      render(<CardHeader>Header Content</CardHeader>);
      expect(screen.getByText('Header Content')).toBeInTheDocument();
    });
  });

  describe('CardTitle', () => {
    it('renders correctly', () => {
      render(<CardTitle>Title</CardTitle>);
      expect(screen.getByText('Title')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<CardTitle className="custom-title">Title</CardTitle>);
      const title = container.firstChild as HTMLElement;
      expect(title).toHaveClass('custom-title');
    });
  });

  describe('CardDescription', () => {
    it('renders correctly', () => {
      render(<CardDescription>Description</CardDescription>);
      expect(screen.getByText('Description')).toBeInTheDocument();
    });
  });

  describe('CardContent', () => {
    it('renders correctly', () => {
      render(<CardContent>Content</CardContent>);
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('CardFooter', () => {
    it('renders correctly', () => {
      render(<CardFooter>Footer</CardFooter>);
      expect(screen.getByText('Footer')).toBeInTheDocument();
    });
  });

  describe('Full Card', () => {
    it('renders complete card structure', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Card</CardTitle>
            <CardDescription>Test Description</CardDescription>
          </CardHeader>
          <CardContent>Test Content</CardContent>
          <CardFooter>Test Footer</CardFooter>
        </Card>
      );

      expect(screen.getByText('Test Card')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
      expect(screen.getByText('Test Footer')).toBeInTheDocument();
    });
  });
});
