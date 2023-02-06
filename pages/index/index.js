import { supabase } from '../../lib/supabase'
import { getRandomName,formatTime } from '../../utils/util'
var mySubscription
Page({
  data: {
    nickName: null,
    totalPeoples: [],
    messages:null,
    message:null,
    inputTxt:'',
    bgColor:null
  },
  onLoad: function (options) {
    // debugger
    if (wx.getStorageSync('nickName') === 'undefined' || wx.getStorageSync('nickName') === '') {
      this.randomUsername()
    } else {
      this.setData({
        nickName: wx.getStorageSync('nickName'),
        // bgColor: wx.getStorageSync('bgColor')
      })
    }
    this.getMessagesAndSubscribe()
    this.getInitialMessages();
    console.log(getRandomName())
  },
  onHide: function () {
    // 页面隐藏
  },
  onUnload: function () {
    // 页面关闭
    supabase.removeChannel(mySubscription);
  },
  getUserInfo: function (cb) {

  },
  addmessage(e){
    this.setData({
      message:e.detail.value
    })
  },
  async send(){
    const { error } = await supabase.from("messages").insert([
      {
        text: this.data.message,
        username:this.data.nickName,
        // bgColor:this.data.bgColor
      },
    ]);
    this.setData({inputTxt:''})
  
  },
  async getInitialMessages(){
      const { data, error } = await supabase
        .from("messages")
        .select()
        .range(0, 49)
        .order("id", { ascending: true });
      if (error) {
        wx.showToast({
          title: error.message || '',
          icon: 'none',
          duration: 3000
        });
        return;
      }
      data.data.forEach((item)=>{
        item.created_at = formatTime(item.created_at)
        if(item.text.split('.')[5]=='png'||item.text.split('.')[5]=='jpg'){
          item.textType = 'image'
        }else{
          item.textType = 'text'
        }
      })
      this.setData({messages:data.data})
      wx.pageScrollTo({
        scrollTop: 2000
    })
  },
  randomUsername: function () {
    this.setData({
      nickName: getRandomName(),
      // bgColor:`#${Math.floor(Math.random() * 0xffffff).toString(16).padEnd(6, "0")}`
    });
    wx.setStorageSync('nickName', this.data.nickName)
    // wx.setStorageSync('bgColor', this.data.bgColor)
  },
  getMessagesAndSubscribe() {
      let mySubscriptions = supabase
        .channel('public:messages')
        .on(
          'postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
          },
          (payload) => {
            this.getInitialMessages();
          }
        ).subscribe();
        mySubscription = mySubscriptions
  },
  addimage(){
    var that = this;
    wx.chooseMedia({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      async success(res) {
        const file = res.tempFiles[0]
        const fileExt = res.tempFiles[0].tempFilePath.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${fileName}`
        let { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, file)
        if (uploadError) {
          throw uploadError
        }
        const { data } = await supabase.storage
          .from('images')
          .download(filePath)
        console.log(data)
        const { error } = await supabase.from("messages").insert([
          {
            text: data,
            username:that.data.nickName,
            // bgColor:that.data.bgColor
          },
        ]);
        that.setData({inputTxt:''})
      }
    })
  },
  bindtap_img: function (e) {
    wx.previewImage({
      current: e.target.dataset.id,
      urls: [e.target.dataset.id]
    })
  },
})