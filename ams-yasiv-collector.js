(function() {
    var proxied = window.XMLHttpRequest.prototype.send;
    var all_asins=[];
    window.XMLHttpRequest.prototype.send = function() {
        //console.log( arguments );
        //Here is where you can add any code to process the request. 
        //If you want to pass the Ajax request object, pass the 'pointer' below
        var pointer = this
        var intervalId = window.setInterval(function(){
                if(pointer.readyState != 4){
                        return;
                }
                if (pointer.responseURL.indexOf('http://yasiv.com/GetData') < 0) {
                    return;
                }                
                //console.log(pointer);
                //console.log(pointer.responseURL);
                
                var respxml = pointer.responseText;
                parseXML(respxml);
                
                //console.log( pointer.responseText );
                //Here is where you can add any code to process the response.
                //If you want to pass the Ajax request object, pass the 'pointer' below
                clearInterval(intervalId);

        }, 1);//I found a delay of 1 to be sufficient, modify it as you need.
        return proxied.apply(this, [].slice.call(arguments));
    };
    
    function parseXML(respxml) {
        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(respxml,"text/xml");
        if (xmlDoc.documentElement.nodeName == 'SimilarityLookupResponse') {
          var level=1;
        } else {
          var level=0
        }
        var asins = xmlDoc.getElementsByTagName("ASIN");
        for (x in asins) {
            if (asins[x].nodeType == 1) {
                //console.log('ASIN: '+asins[x].childNodes[0].nodeValue);
                var asin = asins[x].childNodes[0].nodeValue;
                if (asin.charAt(0) != 'B')
                    continue;
                var p = asins[x].parentNode;
                if (p.nodeName != 'Item')
                    continue;
                var title_nodes = p.getElementsByTagName('Title');
                if (title_nodes && title_nodes[0].nodeType == 1) {
                    var title = title_nodes[0].childNodes[0].nodeValue;
                } else {
                    var title = '';
                }

                var url_nodes = p.getElementsByTagName('DetailPageURL');
                if (url_nodes && url_nodes[0].nodeType == 1) {
                    var url = url_nodes[0].childNodes[0].nodeValue;
                } else {
                    var url = '';
                }

                var sales_rank_nodes = p.getElementsByTagName('SalesRank');
                if (sales_rank_nodes.length && sales_rank_nodes[0].nodeType == 1) {
                    var sales_rank = sales_rank_nodes[0].childNodes[0].nodeValue;
                } else {
                    var sales_rank = '';
                }

                var lowest_new_price = p.getElementsByTagName('LowestNewPrice');
                if (lowest_new_price.length) {
                    var amount = lowest_new_price[0].getElementsByTagName('Amount');
                    if (amount.length && amount[0].nodeType == 1) {
                        var price = parseInt(amount[0].childNodes[0].nodeValue)/100;
                    }
                    else 
                        var price = 0;
                }
                else
                    var price = 0;

                var small_image = p.getElementsByTagName('SmallImage');
                if (small_image.length) {
                    var image_url = small_image[0].getElementsByTagName('URL');
                    if (image_url.length && image_url[0].nodeType == 1) {
                        var image = image_url[0].childNodes[0].nodeValue;
                    }
                    else 
                        var image = '';
                }
                else
                    var image = '';
                    
                var similar = p.getElementsByTagName('SimilarProducts');
                var similar_asins = [];
                if (similar.length && similar[0].nodeType == 1) {
                    var similar_asin_nodes = similar[0].getElementsByTagName('ASIN');
                    for (y in similar_asin_nodes) {
                        if (similar_asin_nodes[y].nodeType==1) {
                            var s_asin = similar_asin_nodes[y].childNodes[0].nodeValue;
                            similar_asins.push(s_asin);
                        }
                    }
                }
                var obj = { 'asin': asin,
                    'level': level,
                    'referenced': 0,
                    'title': title,
                    'sales_rank': sales_rank,
                    'price': price,
                    'url': url,
                    'image': '=IMAGE("'+image+'")',
//                    'image_url': image,
                    'similar_asins': similar_asins,
                }
                //if (level > 0) 
                //    console.log(obj);
                all_asins[asin] = obj;
            }
        }
    }
    function doCollection() {
        for (i=1;i<10;i++) {
          //console.log('i: '+i);
          for (x in all_asins) {
            if (all_asins[x].level == i) {
              //console.log('ASIN: ' + all_asins[x].asin);
              for (y in all_asins[x].similar_asins) {
                if (all_asins[all_asins[x].similar_asins[y]] !== undefined) {
                  if (all_asins[all_asins[x].similar_asins[y]].level == 0) {
                    all_asins[all_asins[x].similar_asins[y]].level = i + 1;
                  }
                  all_asins[all_asins[x].similar_asins[y]].referenced++;
                }
              }
            }
          }
        }    
        var str = '';
        for (var c in all_asins) {
            str += '<tr><td>'+ all_asins[c].asin + '</td><td>' + all_asins[c].level + '</td><td>' + all_asins[c].referenced ;
            str += '</td><td>' + all_asins[c].title
            str += '</td><td>' + all_asins[c].sales_rank 
            str += '</td><td>' + all_asins[c].price 
            str += '</td><td>' + all_asins[c].url 
            str += '</td><td>' + all_asins[c].image 
            str += '</td></tr>';
        }
        jQuery('#capture_table tbody').append(str);

    }
    function clearReset() {
        all_asins=[];
        jQuery('#capture_table tbody').empty();
        alert('Data is cleared, but products may be cached so the data collected may not be accurate. RESTART is preferred.');
    }
    function restart() {
        location.href='/';
    }
    function convertToCSV(objArray) {
        var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
        var str = '';

        for (var i = 0; i < array.length; i++) {
            var line = '';
            for (var index in array[i]) {
                if (line != '') line += ','

                line += array[i][index];
            }

            str += line + '\r\n';
        }
        return str;
    }
    var capture = '<div id="capture" style="font-size:11px;"><div style="text-align: center"><p style="display:inline-block">Run your search then click Finalize when action has stopped.</p><button id="collect_button" style="background: #eee;margin: 0 2px">Finalize</button><button id="capture_button"  style="background: #eee;margin: 0 2px" data-clipboard-target="#capture_table">Copy</button><button id="clear_button" style="background:#eee;margin: 0 2px">Clear</button><button id="restart_button" style="background:#ff8888;margin: 0 2px;">Restart</button></div><table id="capture_table"><thead><tr><th>ASIN</th><th>Level</th><th>Referenced</th><th>Title</th><th>Sales Rank</th><th>Price</th><th>URL</th><th>IMAGE</th></tr><thead><tbody></tbody></table><style>';
        capture += '#capture { z-index:99990;position: fixed; bottom: 10px;left: 10px;width: 800px;height: 300px;overflow:scroll;border: 3px solid blue;background: white}';
        capture += '#capture_table {width: 100%;}';
        capture += '#capture_table thead {border-bottom: 1px solid blue;}';
        capture += '#capture_button {margin: 3px auto;padding: 3px;display: inline-block;}';
        capture += '    </style></div>';
    jQuery('body').append(capture);
    jQuery('#collect_button').click(function(){ doCollection()});
    jQuery('#clear_button').click(function(){ clearReset()});
    jQuery('#restart_button').click(function(){ restart()});
    new Clipboard('#capture_button');
})();