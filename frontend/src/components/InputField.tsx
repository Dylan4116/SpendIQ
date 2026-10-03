import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InputFieldProps extends TextInputProps {
  label: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  error?: string;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  iconName,
  error,
  ...props
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, error ? styles.errorBorder : null]}>
        {iconName && (
          <Ionicons name={iconName} size={20} color="#9F86C0" style={styles.icon} />
        )}
        <TextInput
          style={[styles.input, iconName ? styles.inputWithIcon : null]}
          placeholderTextColor="#A0A0A0"
          {...props}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5E548E',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F8FC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EBE7F2',
  },
  errorBorder: {
    borderColor: '#D9534F',
  },
  icon: {
    marginLeft: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#231942',
  },
  inputWithIcon: {
    paddingLeft: 10,
  },
  errorText: {
    fontSize: 11,
    color: '#D9534F',
    marginTop: 4,
  },
});