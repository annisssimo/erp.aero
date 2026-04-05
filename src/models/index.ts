export { User } from './user';
export { Token } from './token';
export { File } from './file';

import { User } from './user';
import { Token } from './token';

// Associations are defined here so unit tests can mock individual model files
// without triggering cross-model association calls at import time
User.hasMany(Token, { foreignKey: 'userId', onDelete: 'CASCADE' });
Token.belongsTo(User, { foreignKey: 'userId' });
