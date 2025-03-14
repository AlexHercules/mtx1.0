import axios from 'axios';

const API_URL = 'https://api.crowdfunding-app.com';

// 获取用户资料
export const getUserProfile = async () => {
  try {
    const response = await axios.get(`${API_URL}/users/profile`);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : { message: '网络错误' };
  }
};

// 更新用户资料
export const updateProfile = async (profileData) => {
  try {
    const response = await axios.patch(`${API_URL}/users/profile`, profileData);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : { message: '网络错误' };
  }
};

// 更新头像
export const updateAvatar = async (imageFile) => {
  try {
    const formData = new FormData();
    formData.append('avatar', {
      uri: imageFile.uri,
      type: 'image/jpeg',
      name: 'avatar.jpg',
    });
    
    const response = await axios.patch(`${API_URL}/users/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : { message: '网络错误' };
  }
};

// 更改密码
export const changePassword = async (currentPassword, newPassword) => {
  try {
    const response = await axios.patch(`${API_URL}/users/password`, {
      currentPassword,
      newPassword
    });
    
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : { message: '网络错误' };
  }
}; 