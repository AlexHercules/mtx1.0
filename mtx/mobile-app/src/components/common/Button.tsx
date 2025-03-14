import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  TouchableOpacityProps 
} from 'react-native';
import { colors, typography } from '../../theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
}

/**
 * 通用按钮组件
 * 
 * @example
 * <Button 
 *   title="登录" 
 *   onPress={handleLogin} 
 *   loading={isLoading} 
 *   variant="primary"
 *   size="large"
 *   fullWidth
 * />
 */
const Button: React.FC<ButtonProps> = ({
  title,
  loading = false,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  style,
  ...rest
}) => {
  // 根据variant和size计算样式
  const buttonStyle = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    style
  ];
  
  const textStyle = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`]
  ];
  
  return (
    <TouchableOpacity 
      style={buttonStyle} 
      disabled={loading} 
      {...rest}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === 'outline' ? colors.primary : colors.white} 
          size="small" 
        />
      ) : (
        <Text style={textStyle}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.secondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  medium: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  large: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontWeight: 'bold',
  },
  primaryText: {
    color: colors.white,
  },
  secondaryText: {
    color: colors.white,
  },
  outlineText: {
    color: colors.primary,
  },
  smallText: {
    ...typography.caption,
  },
  mediumText: {
    ...typography.body,
  },
  largeText: {
    ...typography.subtitle,
  },
});

export default Button; 