const noopDecorator = () => () => {};

module.exports = {
  GraphQLModule: {
    forRoot: () => ({ module: class MockGraphQLModule {} }),
  },
  ApolloDriver: {},
  ObjectType: noopDecorator,
  InputType: noopDecorator,
  InterfaceType: noopDecorator,
  Field: noopDecorator,
  Query: noopDecorator,
  Mutation: noopDecorator,
  Subscription: noopDecorator,
  Resolver: noopDecorator,
  Args: noopDecorator,
  ResolveField: noopDecorator,
  Parent: noopDecorator,
  Context: noopDecorator,
  ID: 'ID',
  Int: 'Int',
  Float: 'Float',
  registerEnumType: () => {},
};
