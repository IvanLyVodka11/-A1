/**
 * Design System barrel — re-exports all UI components + theme utilities
 *
 * Usage:
 *   import { Button, Input, useTheme, useToast } from '@/components/ui';
 */

// Base components
export { default as Button }        from './Button';
export { default as IconButton }    from './IconButton';
export { default as Input }         from './Input';
export { default as SearchBar }     from './SearchBar';
export { default as Card }          from './Card';
export { default as Toggle }        from './Toggle';
export { default as Select }        from './Select';
export { default as Modal }         from './Modal';
export { default as Tabs }          from './Tabs';
export { default as CountdownDots } from './CountdownDots';

// Toast system
export { ToastProvider, useToast }  from './Toast';

// Theme system (re-exported from theme/ThemeProvider for convenience)
export { ThemeProvider, useTheme }  from '../../theme/ThemeProvider';
