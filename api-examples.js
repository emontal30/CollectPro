// أمثلة على استخدام الـ API من Frontend
import apiClient from "./api-client.js";

class APIExamples {
  // تسجيل الدخول
  static async login(email, password) {
    try {
      const response = await apiClient.post("auth/login", { email, password });
      
      if (response.success) {
        // حفظ التوكن للمصادقة
        apiClient.setToken(response.session.access_token);
        
        // حفظ معلومات المستخدم
        localStorage.setItem("user", JSON.stringify(response.user));
        
        return response;
      } else {
        throw new Error(response.error || "فشل تسجيل الدخول");
      }
    } catch (error) {
      console.error("خطأ في تسجيل الدخول:", error);
      throw error;
    }
  }
  
  // إنشاء حساب جديد
  static async register(email, password, fullName, phone) {
    try {
      const response = await apiClient.post("auth/register", { 
        email, 
        password, 
        fullName, 
        phone 
      });
      
      return response;
    } catch (error) {
      console.error("خطأ في إنشاء الحساب:", error);
      throw error;
    }
  }
  
  // إعادة تعيين كلمة المرور
  static async forgotPassword(email) {
    try {
      const response = await apiClient.post("auth/forgot-password", { email });
      
      return response;
    } catch (error) {
      console.error("خطأ في إعادة تعيين كلمة المرور:", error);
      throw error;
    }
  }
  
  // جلب بيانات التحصيلات
  static async getHarvestData() {
    try {
      const response = await apiClient.get("harvest");
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error || "فشل جلب بيانات التحصيلات");
      }
    } catch (error) {
      console.error("خطأ في جلب بيانات التحصيلات:", error);
      throw error;
    }
  }
  
  // إضافة سجل تحصيل جديد
  static async addHarvestRecord(harvestData) {
    try {
      const response = await apiClient.post("harvest", harvestData);
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error || "فشل إضافة سجل التحصيل");
      }
    } catch (error) {
      console.error("خطأ في إضافة سجل التحصيل:", error);
      throw error;
    }
  }
  
  // جلب البيانات الأرشفية
  static async getArchiveData(date) {
    try {
      const params = date ? { date } : {};
      const response = await apiClient.get("archive", params);
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error || "فشل جلب البيانات الأرشفية");
      }
    } catch (error) {
      console.error("خطأ في جلب البيانات الأرشفية:", error);
      throw error;
    }
  }
  
  // أرشفة البيانات
  static async archiveData(date, harvestData) {
    try {
      const response = await apiClient.post("archive", { date, harvestData });
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error || "فشل أرشفة البيانات");
      }
    } catch (error) {
      console.error("خطأ في أرشفة البيانات:", error);
      throw error;
    }
  }
  
  // جلب بيانات الاشتراك
  static async getSubscriptionData() {
    try {
      const response = await apiClient.get("subscriptions");
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error || "فشل جلب بيانات الاشتراك");
      }
    } catch (error) {
      console.error("خطأ في جلب بيانات الاشتراك:", error);
      throw error;
    }
  }
  
  // تحديث الاشتراك
  static async updateSubscription(subscriptionData) {
    try {
      const response = await apiClient.post("subscriptions", subscriptionData);
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error || "فشل تحديث الاشتراك");
      }
    } catch (error) {
      console.error("خطأ في تحديث الاشتراك:", error);
      throw error;
    }
  }
}

// تصدير الكلاس
export default APIExamples;