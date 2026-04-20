'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class MarketplaceRequest extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  MarketplaceRequest.init({
    studentId: DataTypes.INTEGER,
    teacherId: DataTypes.INTEGER,
    attemptId: DataTypes.INTEGER,
    status: DataTypes.STRING,
    feedbackPath: DataTypes.STRING,
    fee: DataTypes.DECIMAL
  }, {
    sequelize,
    modelName: 'MarketplaceRequest',
  });
  return MarketplaceRequest;
};