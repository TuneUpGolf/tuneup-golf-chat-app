const serverResponseMessage = {
  /* User */
  USER_CREATED: "User Created Succesfully",
  USER_UPDATED: "User Updated Succesfully",
  USER_FETCH: "User Data Fetched Succesfully",
  TOKEN_CREATED: "Token Created Successfully",
  USER_DELETED_SUCCESSFULLY: "User Deleted Successfully",
  USER_NOT_FOUND: "User Not Found",
  MISSING_FIELDS: "Please Provide All Required Fields",

  /* Group */
  GROUP_CREATED: "Group Created Succesfully",
  GROUP_ALREADY_CREATED: "Group Already Created With Same Name",
  GROUP_DELETE: "Group Deleted Succesfully",
  GROUP_FETCH: "Group Data Fetched Succesfully",
  FAILURE_DATA_CREATE: "Failure to Create Record",
  FAILURE_DATA_UPDATE: "Failure to Update Record",
  FAILURE_DATA_GET: "Failure to Get Record",
  ATLEAST_TWO_MEMBERS_REQUIRED:
    "Atleast 2 Group Member is Required to Create a Group",
  Group_list: "Chat group list",
  GROUP_DOES_NOT_EXIST: "Group could not be found",

  GROUP_NOT_PRESENT: "Any Record is Not Matching with Requested Group Name!",
  ATMOST_TWO_MEMBERS_ALLOWED: "Onetoone group can not contain more than two members",
  INVALID_GROUP_MEMBERS: "One or more group members are invalid users",
  SENDER_MUST_BE_INCLUDED: "Sender must be part of the group",
  ONLY_ONE_RECIPIENT_ALLOWED: "Only one recipient allowed for one-to-one chat",

  /* Catch Error */
  Catch_Error: "Please Recitify the Error",
  DATA_READ_ERROR: "Please Request with Proper Data",
  INTERNAL_SERVER_ERROR: " Internal Server Error",


  /* CHAT */
  CHAT_CLEAR: "All Chat has been Clear",
  SELECTED_IMAGES_DELETED: "Selected Images Deleted Successfully",
  ALL_IMAGES_FETCHED: "All Images Fetched Successfully",
  GROUP_CHAT_MESSAGE: "Chat Messages Has Been Fetched Successfully",
  SELECT_FILE: "Please Select a File",
  FILE_SENT_SUCCESSFULLY: "File Sent Successfully",
  MESSAGE_DELETED: "Message Deleted Successfully",
  MESSAGE_NOT_FOUND_IN_CHAT: "Message Not Found in Chat",

  /* Error */
  ERROR: "Please Rectify the Error",


};

module.exports = { serverResponseMessage };
