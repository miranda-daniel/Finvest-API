import validator from 'validator';
import { RegisterUserRequest } from '@typing/user';
import { ErrorMessage } from '@typing/session';

export const registerValidations = (
  request: RegisterUserRequest
): ErrorMessage[] => {
  const errors: ErrorMessage[] = [];

  const { email, password, firstName, lastName } = request;

  if (!email) {
    errors.push({ message: 'Email required' });
  } else if (!validator.isEmail(email)) {
    errors.push({ message: 'Email not valid' });
  }

  if (!password) {
    errors.push({ message: 'Password required' });
  }

  if (!firstName) {
    errors.push({ message: 'First name required' });
  }

  if (!lastName) {
    errors.push({ message: 'Last name required' });
  }

  return errors;
};
