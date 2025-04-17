import User from '../models/User.js';
import { signToken } from '../services/auth.js';
import { GraphQLError } from 'graphql';
import { BookInput } from './types.js';

// Create a custom AuthenticationError using GraphQLError
const AuthenticationError = (message: string): GraphQLError => {
  return new GraphQLError(message, {
    extensions: {
      code: 'UNAUTHENTICATED'
    }
  });
};

interface ResolverContext {
  user: {
    _id: unknown;
    username: string;
    email: string;
  } | null;
}

const resolvers = {
  Query: {
    me: async (_: any, __: any, { user }: ResolverContext) => {
      if (!user) {
        throw AuthenticationError('Not logged in');
      }
      return await User.findOne({ _id: user._id });
    },
  },

  Mutation: {
    addUser: async (_: any, { username, email, password }: { username: string; email: string; password: string }) => {
      const user = await User.create({ username, email, password });
      const token = signToken(user.username, user.email, user._id);
      return { token, user };
    },

    login: async (_: any, { email, password }: { email: string; password: string }) => {
      const user = await User.findOne({ email });

      if (!user) {
        throw AuthenticationError('No user found with this email address');
      }

      const correctPw = await user.isCorrectPassword(password);

      if (!correctPw) {
        throw AuthenticationError('Incorrect credentials');
      }

      const token = signToken(user.username, user.email, user._id);
      return { token, user };
    },

    saveBook: async (_: any, { input }: { input: BookInput }, { user }: ResolverContext) => {
      if (!user) {
        throw AuthenticationError('You need to be logged in!');
      }

      try {
        const updatedUser = await User.findOneAndUpdate(
          { _id: user._id },
          { $addToSet: { savedBooks: input } },
          { new: true, runValidators: true }
        );
        return updatedUser;
      } catch (err) {
        console.log(err);
        throw new GraphQLError('Error saving book', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' }
        });
      }
    },

    removeBook: async (_: any, { bookId }: { bookId: string }, { user }: ResolverContext) => {
      if (!user) {
        throw AuthenticationError('You need to be logged in!');
      }

      const updatedUser = await User.findOneAndUpdate(
        { _id: user._id },
        { $pull: { savedBooks: { bookId } } },
        { new: true }
      );

      if (!updatedUser) {
        throw new GraphQLError("Couldn't find user with this id!", {
          extensions: { code: 'NOT_FOUND' }
        });
      }

      return updatedUser;
    },
  },
};

export default resolvers;