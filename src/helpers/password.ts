import * as bcryptjs from 'bcryptjs';

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcryptjs.genSalt();
  return bcryptjs.hash(password, salt);
};

export const comparePasswords = async (
  password: string,
  passwordStore: string,
): Promise<boolean> => {
  return bcryptjs.compare(password, passwordStore);
};
