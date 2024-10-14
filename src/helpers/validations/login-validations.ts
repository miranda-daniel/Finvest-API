import validator from 'validator';
import { LoginUserRequest } from '@typing/session';
import { ErrorMessage } from '@typing/session';

export const loginValidations = (
  credentials: LoginUserRequest
): ErrorMessage[] => {
  const errors: ErrorMessage[] = [];

  const { email, password } = credentials;

  if (!email) {
    errors.push({ message: 'Email required' });
  } else if (!validator.isEmail(email)) {
    errors.push({ message: 'Email not valid' });
  }

  if (!password) {
    errors.push({ message: 'Password required' });
  }

  return errors;
};
