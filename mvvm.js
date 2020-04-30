// 创建一个Mvvm构造函数
function Mvvm(options = {}) {
  // 挂载所有属性到this.$options上
  this.$options = options;
  // this._data 和vue一样
  let data = this._data = this.$options.data;

  // 数据劫持
  observe(data);
  // 用 this 代理this._data
  for (let key in data) {
    Object.defineProperty(this, key, {
      configurable: true,
      get() {
        return this._data[key]; // this.a = this._data.a
      },
      set(newVal) {
        this._data[key] = newVal;
      }
    });
  }
  // 编译 {{}}
  new Compile(options.el, this);
};

// 创建 Compile 构造函数
// 编译逻辑
function Compile(el, vm) {
  // 将 el 挂载到实例上方便调用
  vm.$el = document.querySelector(el);
  // 在el范围里将内容都拿到，当然不能一个一个的拿
  // 可以选择移到内存中去然后放入文档碎片中，节省开销 
  let fragment = document.createDocumentFragment();

  while (child = vm.$el.firstChild) {
    fragment.appendChild(child); // 将 el 下的内容放到内存中
  }
  // 对 el 的内容进行替换
  function replace(frag) {
    Array.from(frag.childNodes).forEach(node => {
      let txt = node.textContent;
      let reg = /\{\{(.*?)\}\}/g; // 匹配 {{}}
      
      if(node.nodeType === 3 && reg.test(txt)) { // 既是文本节点又有大括号的情况
        console.log(RegExp.$1); // 匹配到的第一个分组 如：a.b, c
        let arr = RegExp.$1.split('.');
        let val = vm;
        arr.forEach(key => {
          val = val[key]; // 一层一层获取，如 this.a.b
        });
        // 用 trim 方法去除收尾空格
        node.textContent = txt.replace(reg,val).trim();
        // 监听变化
        // 给 Watcher 再添加2个参数，用来取新的值(newVal)给回调函数传参
        new Watcher(vm, RegExp.$1, newVal => {
          node.textContent = txt.replace(reg, newVal).trim()
        });
      }
      if(node.nodeType === 1) { // 元素节点
        let nodeAttr = node.attributes; // 获取dom上的所有属性，是个类数组
        console.log(nodeAttr)
        Array.from(nodeAttr).forEach(attr => {
          let name = attr.name; // v-model type
          let exp = attr.value; // c       text
          if(name.includes('v-')) {
            node.value = vm[exp]; // c => 2
          }
          // 监听变化
          new Watcher(vm, exp, function(newVal) {
            node.value = newVal; // 当 watcher 触发时会自动将内容放进输入框中
          });
          node.addEventListener('input', e => {
            let newVal = e.target.value;
            // 相当于给 this.c 赋了一个新值
            // 值改变会调用 set, set 中又会调用 notify， notify 中调用 watcher 的 update 方法实现更新
            vm[exp] = newVal;
          });
        });
      }

      // 如果还有子节点，继续递归 repalce
      if(node.childNodes && node.childNodes.length) {
        replace(node)
      }
    });
  }
  replace(fragment); // 替换内容
  vm.$el.appendChild(fragment); // 在将文档碎片放入 el 中
}

// 发布订阅模式 订阅和发布 如 [fn1, fn2, fn3]
function Dep() {
  // 创建一个数组存放函数事件池
  this.subs = [];
}
Dep.prototype = {
  addSub(sub) {
    this.subs.push(sub);
  },
  notify() {
    // 绑定的方法，都有一个 update 方法，通知订阅者更新
    this.subs.forEach(sub => sub.update());
  }
}
// 监听函数
// 通过 Watcher 这个类创建的实例，都拥有 update 方法
function Watcher(vm, exp, fn) {
  this.fn = fn; // 将 fn 放到实例上
  this.vm = vm;
  this.exp = exp;
  // 添加一个时间
  // 先定义一个属性
  Dep.target = this;
  let arr = exp.split('.');
  let val = vm;
  arr.forEach(key => {
    val = val[key];
  });
  Dep.target = null;
}
Watcher.prototype.update = function () {
  // notify 的时候值已经改变了
  // 在通过 vm, exp 来获取新值
  let arr = this.exp.split('.');
  let val = this.vm;
  arr.forEach(key => {
    val = val[key]
  })
  this.fn(val);
}

// let watcher = new Watcher(() => console.log(111));
// let dep = new Dep();
// dep.addSub(watcher);
// dep.addSub(watcher);
// dep.notify()


// 创建一个 Observe 构造函数
// 数据劫持主要逻辑
function Observe(data) {
  let dep = new Dep();
  // 数据劫持就是给对象增加 get,set
  for (let key in data) {
    let val = data[key];
    observe(val); // 递归向下查找，深度劫持
    Object.defineProperty(data, key, {
      configurable: true,
      get() {
        Dep.target && dep.addSub(Dep.target); // 将 warcher 添加到订阅事件中 [watcher]
        return val;
      },
      set(newVal) {
        if(val === newVal) {
          return;
        }
        val = newVal; // 替换 get 值
        observe(newVal); // 为新值做数据劫持
        dep.notify(); // 通知更新数据
      }
    });
  }
};

function observe(data) {
  // 如果不是对象就 return
  // 防止溢出
  if(!data || typeof data !== 'object') return;
  return new Observe(data);
}



