const {
  RegistrationRepository,
  REGISTRATION_STATUS
} = require('../repositories/registration.repository');

let registrationRepository = null;

function getRegistrationRepository() {
  if (!registrationRepository) registrationRepository = new RegistrationRepository();
  return registrationRepository;
}

class RegistrationModel {
  static get status() {
    return REGISTRATION_STATUS;
  }

  static eventExists(eventId) {
    return getRegistrationRepository().eventExists(eventId);
  }

  static register({ userId, eventId }) {
    return getRegistrationRepository().register(userId, eventId, new Date().toISOString());
  }

  static unregister({ userId, eventId }) {
    return getRegistrationRepository().unregister(userId, eventId, new Date().toISOString());
  }
}

module.exports = RegistrationModel;
