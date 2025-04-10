const bcrypt = require("bcrypt");
const plainPassword = "1234";
const saltRounds = 10;
bcrypt.hash(plainPassword, saltRounds, function(err, hash) {
  if (err) throw err;
  // Insert the user with hash as the password_hash.
  console.log(hash);
});
