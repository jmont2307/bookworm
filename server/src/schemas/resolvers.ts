import User from '../models/User.js';
import { signToken } from '../services/auth.js';
import { GraphQLError } from 'graphql';

// Create a custom AuthenticationError using GraphQLError
const AuthenticationError = (message) => {
  return new GraphQLError(message, {
    extensions: {
      code: 'UNAUTHENTICATED'
    }
  });
};

const resolvers = {
  Query: {
    me: async (_, __, { user }) => {
      if (!user) {
        throw AuthenticationError('Not logged in');
      }
      return await User.findOne({ _id: user._id });
    },
  },

  Mutation: {
    addUser: async (_, { username, email, password }) => {
      const user = await User.create({ username, email, password });
      const token = signToken(user.username, user.email, user._id);
      return { token, user };
    },

    login: async (_, { email, password }) => {
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

    saveBook: async (_, { input }, { user }) => {
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

    removeBook: async (_, { bookId }, { user }) => {
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