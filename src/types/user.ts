export interface UserIndex {
  firstName: string;
  lastName: string;
}

export interface UserIndexRaw {
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

export interface UserRaw extends User {
  password: string;
}

export interface PartialUser extends Partial<RegisterUserRequest> {}
