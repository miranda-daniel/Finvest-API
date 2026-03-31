export interface UserIndex {
  firstName: string;
  lastName: string;
}

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
}

export interface RegisterUserRequest extends Omit<User, 'id'> {
  password: string;
}
