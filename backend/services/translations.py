STATION_NAMES = {
    "北京": "Beijing",
    "北京南": "Beijing South",
    "北京北": "Beijing North",
    "北京东": "Beijing East",
    "北京西": "Beijing West",
    "北京大兴": "Beijing Daxing",
    "北京朝阳": "Beijing Chaoyang",
    "北京通州": "Beijing Tongzhou",
    "北京丰台": "Beijing Fengtai",
    "上海": "Shanghai",
    "上海虹桥": "Shanghai Hongqiao",
    "上海南": "Shanghai South",
    "上海松江": "Shanghai Songjiang",
    "广州": "Guangzhou",
    "广州南": "Guangzhou South",
    "广州东": "Guangzhou East",
    "深圳": "Shenzhen",
    "深圳北": "Shenzhen North",
    "成都": "Chengdu",
    "成都东": "Chengdu East",
    "成都西": "Chengdu West",
    "重庆": "Chongqing",
    "重庆北": "Chongqing North",
    "重庆西": "Chongqing West",
    "西安": "Xi'an",
    "西安北": "Xi'an North",
    "西宁": "Xining",
    "兰州": "Lanzhou",
    "兰州西": "Lanzhou West",
    "武汉": "Wuhan",
    "郑州": "Zhengzhou",
    "郑州东": "Zhengzhou East",
    "南京": "Nanjing",
    "南京南": "Nanjing South",
    "杭州": "Hangzhou",
    "杭州东": "Hangzhou East",
    "长沙": "Changsha",
    "长沙南": "Changsha South",
    "天津": "Tianjin",
    "天津南": "Tianjin South",
    "济南": "Jinan",
    "济南西": "Jinan West",
    "青岛": "Qingdao",
    "青岛北": "Qingdao North",
    "哈尔滨": "Harbin",
    "哈尔滨西": "Harbin West",
    "沈阳": "Shenyang",
    "沈阳北": "Shenyang North",
    "大连": "Dalian",
    "大连北": "Dalian North",
    "昆明": "Kunming",
    "昆明南": "Kunming South",
    "贵阳": "Guiyang",
    "贵阳北": "Guiyang North",
    "南宁": "Nanning",
    "南宁东": "Nanning East",
    "厦门": "Xiamen",
    "厦门北": "Xiamen North",
    "福州": "Fuzhou",
    "福州南": "Fuzhou South",
    "合肥": "Hefei",
    "合肥南": "Hefei South",
    "太原": "Taiyuan",
    "太原南": "Taiyuan South",
    "石家庄": "Shijiazhuang",
    "广元": "Guangyuan",
    "西安": "Xi'an",
}

SEAT_CLASSES = {
    "商务座": "Business Class",
    "特等座": "Premium Class",
    "一等座": "First Class",
    "二等座": "Second Class",
    "软卧": "Soft Sleeper",
    "硬卧": "Hard Sleeper",
    "软座": "Soft Seat",
    "硬座": "Hard Seat",
    "无座": "No Seat",
    "动卧": "Night Train Sleeper",
    "business": "Business Class",
    "first_class": "First Class",
    "second_class": "Second Class",
    "soft_sleeper": "Soft Sleeper",
    "hard_sleeper": "Hard Sleeper",
    "soft_seat": "Soft Seat",
    "hard_seat": "Hard Seat",
    "no_seat": "No Seat",
}

SEAT_CLASS_ZH = {
    "business": "商务座",
    "first_class": "一等座",
    "second_class": "二等座",
    "soft_sleeper": "软卧",
    "hard_sleeper": "硬卧",
    "soft_seat": "软座",
    "hard_seat": "硬座",
    "no_seat": "无座",
}

def translate_station(name: str) -> str:
    return STATION_NAMES.get(name, name)

def translate_availability(value: str) -> str:
    if value == "有":
        return "Available"
    if value == "无":
        return "Not Available"
    return value

# Get both English and Chinese names of stations and seat options
def bilingual_station(chinese_name: str) -> dict:
    return {
        "zh": chinese_name,
        "en": translate_station(chinese_name)
    }

def bilingual_seats(seats: dict) -> list:
    result = []
    for key, value in seats.items():
        result.append({
            "class_zh": SEAT_CLASS_ZH.get(key, key),
            "class_en": SEAT_CLASSES.get(key, key),
            "availability": translate_availability(value)
        })
    return result