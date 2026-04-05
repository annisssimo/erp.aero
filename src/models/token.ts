import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface TokenAttributes {
  id: number;
  userId: string;
  deviceId: string;
  refreshToken: string;
  revoked: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

type TokenCreationAttributes = Optional<
  TokenAttributes,
  'id' | 'revoked' | 'createdAt' | 'updatedAt'
>;

export class Token
  extends Model<TokenAttributes, TokenCreationAttributes>
  implements TokenAttributes
{
  public id!: number;
  public userId!: string;
  public deviceId!: string;
  public refreshToken!: string;
  public revoked!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Token.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    deviceId: {
      type: DataTypes.STRING(36),
      allowNull: false,
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    revoked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'tokens',
  },
);
