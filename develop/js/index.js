(function(){
    var Remote = ripple.Remote;
    var remote = new Remote({
      servers: [ 'wss://s1.ripple.com:443' ]
    });
    remote.connect(function() {
        remote.requestServerInfo(function(err, info) {
          console.log(err, info);
        });
    });

    var milkcocoa = new MilkCocoa("https://io-ni5704e2j.mlkcca.com:443");
    var ds_proposals = milkcocoa.dataStore("proposals");
    var ds_members = milkcocoa.dataStore("members");
    var ds_orders = milkcocoa.dataStore("orders");
    var ds_accept = milkcocoa.dataStore("accept");

    var prp_cls = "container--body--orders--members";
    var ingredient_names = ["shio", "shake", "asari", "mentai", "ume"];
    var $ordernum_html = $("#ordernum");
    var $container_header = $(".container--header");
    var $menu = $(".container--body--menu");
    var $orders = $(".container--body--orders");

    // var seller_name = "Takenoshin Tokutsu";
    var seller_name = "Shogo Ochiai";
    var admin_name = "Shogo Ochiai";



    // 注文総数とおにぎり受注時の画面ロック


    // おにぎり総数の初期化
    sync_ordernum();

    isAccept(function(bool){
        if(bool){
            $container_header.append("<h1 class='container--body--accept_mode' id='accept_state'>配達中だよ！</h1>");
            $container_header.append("<p>オーダーは変更できません。もし何かあったらチャットでやりとりしてね。</p>");
        } else {
            $container_header.append("<h3 class='container--body--accept_mode' id='accept_state'>注文受付中だよ！</h1>");
        }
    });

    // ordersを削除するタイミングについて考える
    // fbに投稿するボタンについて考える


    // たけのしんがおにぎりの具を管理できたら良い
    $menu.append("<h2>メニュー</h2>");
    $orders.prepend("<h2>オーダー</h2>");
    for(var i = 0; i < ingredient_names.length; i++){
        $menu.append("<img src='pic/"+ingredient_names[i]+".png' width='180px' id='"+ingredient_names[i]+"'>");
    }

    // ユーザー一覧生成
    ds_members.query({}).done(function(users){
        for(var i = 0; i < users.length; i++){
            var each_user = users[i];
            var base_cls = prp_cls + "--" + each_user.fbid;
            // メンバー表示
            // その人が頼んだおにぎりの個数を調べて表示する
            $("."+prp_cls).append("<p class='"+base_cls+"'>" + each_user.name + "</p>");

            // 注文表示ボタン
            // user_idを元にordersDSに検索をかけて描画する。おにぎりマークのclassにおにぎりidを持たせる。
            ds_orders.query({user_id: each_user.fbid}).done(function(targets){
                // 全てのオーダーが一人のユーザーに集中している。
                // push時の時点ではuser_idは正常だが、append時に"xxxxxxxxxxxxx"に描画しちゃってる
                for(var j = 0; j < targets.length; j++){
                    var order_id = targets[j].id;
                    var ingredient_name = targets[j].ingredient_name;
                    var order_img_dom = "<img src='pic/"+ingredient_name+".png' width='50px' class='"+order_id+"'>"
                    var parent_cls = prp_cls + "--" + targets[j].user_id;
                    $("."+parent_cls).append(order_img_dom);

                    // 他のユーザーがおにぎりを消せなくする
                    order_erase_listener(order_id);
                }
            });
        }
    });

    milkcocoa.getCurrentUser(function(err, current_user){

        var isLoggedIn = (err == null);
        console.log("isLoggedIn", isLoggedIn);
        if (isLoggedIn) {
            // logoutボタン
            render_chat();
            $("#auth_area").append('<button class="btn btn-primary" id="logout"><i class="fa fa-facebook container--header--logout_icon"></i>logout</button>')
            $("#logout").click(function(e){
                milkcocoa.logout(function(){
                    alert("logged out :)");
                    location.reload();
                });
            });

            // chat処理書きたい

        } else {
            // loginとグループ申請送信
            $("#auth_area").append('<button class="btn btn-primary" id="login"><i class="fa fa-facebook container--header--login_icon"></i>login</button>')
            $("#login").click(function(e){
                milkcocoa.auth("facebook", function(err, user){
                   switch(err){
                      case null:

                        /* 俺はmemberデータストアに主導で入れる。*/

                        //たけのしんはメンバー申請を自動でパス。
                        if (user.name == seller_name) {
                            alert("You're "+seller_name+", onigiri master :)");
                            location.reload();
                        }

                        // 申請中でもなくメンバーでもなければ、申請する
                        ds_proposals.query({fbid:user.id}).done(function(target_proposals){
                            ds_members.query({fbid:user.id}).done(function(target_members){
                                var not_exists = !(target_proposals[0] || target_members[0]);
                                if (not_exists) {
                                    ds_proposals.push({fbid:user.id,name:user.name, date: new Date()});
                                    alert("Sent onigiri member proposal :)");
                                    location.reload();
                                } else if (target_proposals[0]) {
                                    alert("You've already proposed, wait the acception ;)");
                                    location.reload();
                                } else {
                                    alert("You're onigiri member, congrats :)");
                                    location.reload();
                                }
                            });
                        });
                        break;
                      case 1:
                        alert("Sorry, auth failed :(");
                        break;
                    }
                });
            });
        }

        // グループ管理者モード
        var mode = decodeURI(location.hash.substr(1));
        if (mode == "admin"){
            var isShogo = (current_user.name == admin_name);
            if(isShogo){
                console.log(admin_name + " mode :)");
                ds_proposals.query({}).done(function(users){
                    console.log(users);
                    for(i=0; i < users.length; i++ ){
                        var each_user = users[i];
                        var prp_cls = "container--body--proposals";
                        var base_cls = prp_cls + "--" + each_user.fbid;
                        var ok_cls = base_cls + "--ok";
                        var ng_cls = base_cls + "--ng";
                        var ok_btn = "<button class='btn btn-primary "+ok_cls+"'>OK</button>";
                        var ng_btn = "<button class='btn btn-primary "+ng_cls+"'>NG</button>";

                        // 申請者表示
                        $("."+prp_cls).append("<div id='"+each_user.name+"--proposal'><p class='"+base_cls+"'>" + each_user.name + ok_btn + ng_btn + "</p></div>");
                        $("."+ok_cls).css("margin-left", "10px");
                        $("."+ng_cls).css("margin-left", "10px");

                        // 承認
                        $("."+ok_cls).click(function(e){
                            var user_id_seed = $(this).parent().attr("class");
                            var reg = new RegExp(prp_cls + "--");
                            var user_id = user_id_seed.replace(reg, "");

                            ds_proposals.query({fbid: user_id}).done(function(targets){
                                var target = targets[0];
                                ds_members.push({ fbid : target.fbid, name : target.name });
                                ds_proposals.remove(target.id);
                                location.reload();
                            });
                        });

                        // 拒否
                        $("."+ng_cls).click(function(e){
                            var user_id_seed = $(this).parent().attr("class");
                            var reg = new RegExp(prp_cls + "--");
                            var user_id = user_id_seed.replace(reg, "");

                            ds_proposals.query({fbid: user_id}).done(function(targets){
                                ds_proposals.remove(targets[0].id);
                                location.reload();
                            });
                        });
                    }
                });

            } else {
              location.href = "http://"+location.host;
            }

        // 販売者モード
        } else if (mode == "seller"){
            var isTakenoshin = (current_user.name == seller_name);
            if(isTakenoshin){
                console.log(seller_name + " mode :)");
                isAccept(function(bool){
                    if(bool){
                        set_quit_accept_btn(set_accept_btn);
                    } else {
                        set_accept_btn(set_quit_accept_btn);
                    }
                });
                // オーダー初期化関数を考える
            } else {
              location.href = "http://"+location.host;
            }

        // 一般ユーザーモード
        } else if (mode == "") {
            // current_userがmembersに含まれていたら許可
            ds_members.query({fbid:current_user.id}).done(function(targets){
                var target = targets[0];
                if(target){
                    // おにぎりを注文できる処理
                    for ( var k = 0; k < ingredient_names.length; k++){
                        $("#"+ingredient_names[k]).click(function(){
                            var ingredient_name = $(this).attr("id");
                            accept_filter(function(){
                                ds_orders.push({ user_id : target.fbid, user_name: target.name, ingredient_name : ingredient_name });
                            });
                        });
                    }
                } else {
                    for ( var k = 0; k < ingredient_names.length; k++){
                        $("#"+ingredient_names[k]).click(function(){
                            alert("Member only, Sir :)");
                        });
                    }
                }
            });
        } else {
            alert("no such hash ;p");
            location.href = "http://"+location.host;
        }
    });



    /* 受動的な関数を集めておく */

    ds_orders.on("push", function(order){
        // 新規にappendされたおにぎりは、on("remove", cb)で削除できないのはなぜ？
        // clickイベントが設定されていないっぽいので、設定してあげなくてはならない
        console.log(order);
        var ingredient_name = order.value.ingredient_name;
        var order_img_dom = "<img src='pic/"+ingredient_name+".png' width='50px' class='"+order.id+"'>"
        var clicked_id = $(this).attr("class");

        $(".container--body--orders--members--" + order.value.user_id).append(order_img_dom);

        // 総数監視
        sync_ordernum();

        // 削除イベントを設定, 下のon("remove", cb)で削除
        order_erase_listener(order.id);
    });

    ds_orders.on("remove", function(e){
        $("."+e.id).remove();
        sync_ordernum();
    });

    ds_accept.on("set", function(e){
        location.reload();
    });


    $(window).on('hashchange', function(){
      location.reload();
    });

    function change_accept_mode (bool) {
        ds_accept.set("accept", {state:bool, update_date: new Date()});
    }

    function accept_filter (cb) {
        ds_accept.get("accept", function(e){
            if(e.state){
                // acceptモードでは処理を許さない
                console.error("order was fixed.");
                return ;
            } else {
                cb();
            }
        });
    }
    function set_accept_btn (cb) {
        // cbにはset_quit_accept_btnが入る
        $container_header.append("<button class='btn btn-danger pull-right' id='accept'><i class='fa fa-jpy container--header--accept_icon'></i>受注する</button>");
        $("#accept").click(function(e){
            change_accept_mode(true);
            $("#accept").remove();

            if(cb!=null){
                cb();
            }
        });
    }

    function set_quit_accept_btn (cb) {
        // cbにはset_accept_btnが入る
        $container_header.append("<button class='btn btn-primary pull-right' id='quit_accept'><i class='fa fa-jpy container--header--accept_icon'></i>受注解除する</button>");
        $container_header.append("<button class='btn btn-large btn-danger pull-right' id='reset_orders'>オーダーを初期化する</button>");
        $("#quit_accept").click(function(){
            change_accept_mode(false);
            $("#quit_accept").remove();
            $("#reset_orders").remove();

            if(cb!=null){
                cb();
            }
        });
        $("#reset_orders").click(function(){
            reset_orders();
        });
    }

    function isAccept (cb) {
        ds_accept.get("accept", function(e){
            cb(e.state);
        });
    }

    // ログインしてる人用のチャット枠
    function render_chat () {
    }

    // 総数監視
    function sync_ordernum(){
        ds_orders.query({}).done(function(orders){
            $ordernum_html.html(orders.length);
        });
    }

    function order_erase_listener(order_id){
        $("."+order_id).click(function(){
            var user_id_seed = $(this).parent().attr("class");
            var reg = new RegExp(prp_cls + "--");
            var user_id = user_id_seed.replace(reg, "");
            var clicked_id = $(this).attr("class");
            accept_filter(function(){
                milkcocoa.getCurrentUser(function(err, current_user){
                    if (user_id == current_user.id){
                        ds_orders.remove(clicked_id);
                    } else {
                        alert("You cannot erase other person's onigiri :(");
                    }
                });
            });
        });
    }

    function reset_orders(){
        ds_orders.query({}).done(function(orders){
            orders.forEach(function(order){
                ds_orders.remove(order.id);
            });
        });
    }

    function escapeHTML(val) {
        return $('<div />').text(val).html();
    };

    var check_sp = (ua('iPhone') > 0 && ua('iPad') == -1) || ua('iPod') > 0 || ua('Android') > 0;
    if (check_sp) $(".modal-dialog").addClass('modal-sm');
    function ua(user_agent){
        return navigator.userAgent.indexOf(user_agent);
    }

})();
