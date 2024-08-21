interface UserState {
    [key: string]: {
      step: string;
      // Other temporary data relevant to the current interaction
    };
  }
  
  const userState: UserState = {};
  
  export const setUserState = (userId: string, step: string) => {
    userState[userId] = { step };
  };
  
  export const getUserState = (userId: string) => {
    return userState[userId] || {};
  };
  
  export const clearUserState = (userId: string) => {
    delete userState[userId];
  };
  