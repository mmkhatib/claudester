# Contributing to Claudester

Thank you for your interest in contributing to Claudester! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

Please be respectful and constructive in all interactions. We are committed to providing a welcoming and inclusive environment for all contributors.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/mmkhatib/claudester/issues)
2. If not, create a new issue with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version, etc.)
   - Screenshots if applicable

### Suggesting Features

1. Check [Discussions](https://github.com/mmkhatib/claudester/discussions) for similar ideas
2. Create a new discussion or issue with:
   - Clear description of the feature
   - Use cases and benefits
   - Possible implementation approach
   - Any relevant mockups or examples

### Pull Requests

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/claudester.git
   cd claudester
   git remote add upstream https://github.com/mmkhatib/claudester.git
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

3. **Make your changes**
   - Write clean, readable code
   - Follow existing code style
   - Add tests for new functionality
   - Update documentation as needed

4. **Test your changes**
   ```bash
   npm run lint          # Check code style
   npm run type-check    # TypeScript type checking
   npm test              # Run all tests
   npm run test:coverage # Ensure coverage
   ```

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `style:` Code style changes (formatting, etc.)
   - `refactor:` Code refactoring
   - `test:` Adding or updating tests
   - `chore:` Maintenance tasks

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your branch
   - Fill in the PR template
   - Link related issues

## Development Setup

### Prerequisites

- Node.js 20+
- MongoDB 7+
- Redis 7+
- Anthropic API Key

### Installation

```bash
# Clone your fork
git clone https://github.com/your-username/claudester.git
cd claudester

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your configuration

# Build agent TypeScript files
npm run build:agents

# Start development server
npm run dev
```

### Project Structure

```
claudester/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── (dashboard)/       # Dashboard pages
│   └── demo/              # Demo page
├── backend/               # Backend services
│   ├── agents/           # AI agent system
│   ├── spec-processor/   # SPEC format processor
│   └── task-queue/       # Bull queue system
├── components/           # React components
│   ├── layout/          # Layout components
│   ├── monitor/         # Monitoring components
│   ├── testing/         # Testing interface
│   └── ui/              # UI primitives
├── lib/                 # Utilities
│   ├── db/             # Database models
│   └── websocket/      # WebSocket client
└── spec/               # SPEC documents
```

## Code Style

### TypeScript

- Use TypeScript for all code
- Define types and interfaces
- Avoid `any` type when possible
- Use meaningful variable names

### React Components

- Use functional components with hooks
- Extract reusable logic into custom hooks
- Keep components small and focused
- Use proper TypeScript types for props

### Example Component

```typescript
import { FC } from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
  children: React.ReactNode;
}

export const Button: FC<ButtonProps> = ({
  variant = 'primary',
  onClick,
  children
}) => {
  return (
    <button
      onClick={onClick}
      className={`btn btn-${variant}`}
    >
      {children}
    </button>
  );
};
```

## Testing

### Writing Tests

- Write tests for all new features
- Maintain >80% code coverage
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

### Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);

    await userEvent.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

## Documentation

- Update README.md for new features
- Add JSDoc comments for functions
- Update API documentation
- Include examples where helpful

## Questions?

- Open a [Discussion](https://github.com/mmkhatib/claudester/discussions)
- Comment on related issues
- Reach out to maintainers

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Claudester! 🚀
