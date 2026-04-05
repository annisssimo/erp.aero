import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface FileAttributes {
  id: number;
  name: string;
  ext: string;
  mimeType: string;
  size: number;
  path: string;
  uploadDate: Date;
}

type FileCreationAttributes = Optional<FileAttributes, 'id' | 'uploadDate'>;

export class File extends Model<FileAttributes, FileCreationAttributes> implements FileAttributes {
  public id!: number;
  public name!: string;
  public ext!: string;
  public mimeType!: string;
  public size!: number;
  public path!: string;
  public uploadDate!: Date;
}

File.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    ext: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    size: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    path: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    uploadDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'files',
    timestamps: false,
  },
);
