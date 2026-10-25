// Errors whose message is safe to show to the user (Discord reply or API response).
class UserError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

class ValidationError extends UserError {}
class NotFoundError extends UserError {}
class PermissionError extends UserError {
  constructor(message = "You don't have permission to do that.") {
    super(message);
  }
}

module.exports = { UserError, ValidationError, NotFoundError, PermissionError };
