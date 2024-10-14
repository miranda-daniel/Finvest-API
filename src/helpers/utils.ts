import * as bcryptjs from 'bcryptjs';

export const hashPassword = (password: string): Promise<string> => {
  const salt = bcryptjs.genSaltSync();
  return bcryptjs.hash(password, salt);
};

export const comparePasswords = async (
  password: string,
  passwordStore: string
): Promise<boolean> => {
  const isMatch = await bcryptjs.compare(password, passwordStore);
  return isMatch;
};
