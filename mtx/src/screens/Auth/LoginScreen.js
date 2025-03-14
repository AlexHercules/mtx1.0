import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  Image,
  ActivityIndicator
} from 'react-native';
import { login, wechatLogin } from '../../services/authService';
import * as WechatSDK from 'react-native-wechat-lib';
import { useNavigation } from '@react-navigation/native';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  // 处理登录
  const handleLogin = async () => {
    if (!email || !password) {
      return Alert.alert('错误', '请输入邮箱和密码');
    }
    
    try {
      setLoading(true);
      const response = await login(email, password);
      Alert.alert('成功', '登录成功');
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('登录失败', error.message || '请检查您的邮箱和密码');
    } finally {
      setLoading(false);
    }
  };

  // 处理微信登录
  const handleWechatLogin = async () => {
    try {
      setLoading(true);
      
      // 检查微信是否已安装
      const isWXAppInstalled = await WechatSDK.isWXAppInstalled();
      if (!isWXAppInstalled) {
        return Alert.alert('错误', '请先安装微信应用');
      }
      
      // 发起微信认证
      const authResponse = await WechatSDK.sendAuthRequest('snsapi_userinfo');
      
      // 使用获取的code向后端请求登录
      const wechatData = {
        wechatCode: authResponse.code
      };
      
      const loginResponse = await wechatLogin(wechatData);
      Alert.alert('成功', '微信登录成功');
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('微信登录失败', error.message || '请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image 
        source={require('../../assets/logo.png')} 
        style={styles.logo} 
      />
      
      <Text style={styles.title}>登录众筹平台</Text>
      
      <TextInput
        style={styles.input}
        placeholder="邮箱"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="密码"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity 
        style={styles.forgotPassword}
        onPress={() => navigation.navigate('ForgotPassword')}
      >
        <Text style={styles.forgotPasswordText}>忘记密码?</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.loginButton}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.loginButtonText}>登录</Text>
        )}
      </TouchableOpacity>
      
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>或</Text>
        <View style={styles.dividerLine} />
      </View>
      
      <View style={styles.socialButtons}>
        <TouchableOpacity 
          style={[styles.socialButton, styles.wechatButton]}
          onPress={handleWechatLogin}
        >
          <Image 
            source={require('../../assets/wechat-icon.png')} 
            style={styles.socialIcon} 
          />
          <Text style={styles.socialButtonText}>微信登录</Text>
        </TouchableOpacity>
        
        {/* 其他第三方登录按钮 */}
      </View>
      
      <View style={styles.registerContainer}>
        <Text style={styles.registerText}>还没有账号? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.registerLink}>立即注册</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#3498db',
    fontSize: 14,
  },
  loginButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#3498db',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#999',
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 20,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginHorizontal: 5,
  },
  wechatButton: {
    backgroundColor: '#07C160',
  },
  socialIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  socialButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  registerContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  registerText: {
    color: '#666',
  },
  registerLink: {
    color: '#3498db',
    fontWeight: 'bold',
  },
});

export default LoginScreen; 