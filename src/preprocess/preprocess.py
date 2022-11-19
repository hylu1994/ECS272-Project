import json
import csv
from collections import defaultdict
from pprint import pprint
import requests
from bs4 import BeautifulSoup
import sys
import datetime

csv.field_size_limit(sys.maxsize)
def main():
    if __name__ == '__main__':
        # movie_principals = tsv_to_dicts(r'principals.tsv') 
        # english_movie_ids = json.load(open(r'english_movie_ids.json'))
        # actor_names = tsv_to_dicts(r'name.tsv') 
        # actor_nid_dict = {x['nconst']: x for x in actor_names}
        # movie_infos = tsv_to_dicts(r'title_basics.tsv')
        # movie_id_dict = {x['tconst']: x for x in movie_infos}
        # print(len(movie_ids))
        # filtered_movies = filter_movie(movie_id_dict, english_movie_ids)
        # save_json(filtered_movies, r'filtered_movies.json')
        filtered_movies = json.load(open(r'kept_movies.json'))
        movie_ids = list(map(lambda movie: movie['tconst'], filtered_movies))
        print(len(movie_ids))
        scrape_imdb_film_credits(movie_ids)



               



def tsv_to_dicts(csvFilePath):
    #read csv file
    csvReader = None
    csvf = open(csvFilePath, encoding='utf-8')
        #load csv file data using csv library's dictionary reader
    csvReader = csv.DictReader(csvf, delimiter='\t', skipinitialspace=True) 
    return csvReader
    for row in csvReader: 
        #add this python dict to json array
        if(row['tconst'] == 'tt0496806'):
            pprint(row)

def save_json(data, filepath=r'new_dict.json'):
    with open(filepath, 'w') as fp:
        json.dump(data, fp, indent=4)

def scrape_imdb_film_credits(film_id_list):
    imdb_film_prefix = "https://www.imdb.com/title/"
    imdb_full_credit_suffix = "/fullcredits"
    count = 0
    movie_credits = []
    total_time = 0
    total_movies = len(film_id_list)
    t_previous = datetime.datetime.now()
    for id in film_id_list:
        url = imdb_film_prefix + id + imdb_full_credit_suffix 
        response = requests.get(url)
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            cast_list = scrape_cast_list(soup)
            poster = scrape_poster(soup)
            director_list = scrape_simpleTable(soup, "director")
            writer_list = scrape_simpleTable(soup, "writer")
            producer_list = scrape_simpleTable(soup, "producer")

            film_credits = {
                "id": id,
                "poster": poster,
                "casts": cast_list,
                "directors": director_list,
                "writers": writer_list,
                "producers": producer_list
            }
            save_json(film_credits, "film_credits/" +id+".json")
            t_cur = datetime.datetime.now()
            total_time += (t_cur - t_previous).microseconds 
            t_previous = t_cur
            count += 1
            avg_time = total_time/count
            estimate_left_time = avg_time*(total_movies - count)/60/1000000
            print("{}/{}, {} minutes left".format(count, total_movies, estimate_left_time))

def scrape_poster(soup):
    try:
        img_tag = soup.find("img", attrs={"class": "poster"})
        img_src = img_tag.get("src")
        return img_src
    except Exception as e:
        return None


def scrape_cast_list(soup):
    try:
        cast_list_table = soup.find_all("table", attrs={"class": "cast_list"})
        if not cast_list_table:
            return None
        cast_list_table = cast_list_table[0].contents

        casts = []
        candidate_num = 0
        for cast_row in cast_list_table: 
            if cast_row == '\n': continue
            # print(cast_row)
            # print("--------------")
            if cast_row.has_attr('class'):
                cast = {
                    "rank": candidate_num + 1,
                }
                for info in cast_row.contents:
                    if info == '\n': continue
                    # image
                    if info.has_attr("class") and info['class'][0] == 'primary_photo':
                        img_tag = info.find("img")
                        if img_tag is None:
                            img_src = "None"
                        else:
                            img_src = img_tag.get('src')
                        cast['img'] = img_src
                    # actor name
                    if not info.has_attr("class"):
                        a_tag = info.find("a")
                        if a_tag is None:
                            actor_name = "None"
                        else:
                            actor_name = a_tag.text.strip()
                            src = a_tag.get('href')
                            if src is None:
                                actor_id = None
                            else:
                                actor_id = src.split("/")[2]
                        cast['name'] = actor_name
                        cast['id'] = actor_id
                    # character name
                    if info.has_attr("class") and info['class'][0] == 'character':
                        a_tag = info.find("a")
                        if a_tag is None:
                            character_name = "None"
                        else:
                            character_name = a_tag.text.strip()
                        cast['character'] = character_name
                casts.append(cast)
                candidate_num += 1
        return casts
        # movie_info = {
        #     "id": id,
        #     "top_casts": top_casts
        # }
        # save_json(movie_info, "movie_top_casts/" +id+".json")
        # movie_top_casts.append(movie_info)
    except Exception as e:
        return None


def scrape_simpleTable(soup, id):
    try:
        header =  soup.find("h4", attrs={"id": id})
        table = header.nextSibling.nextSibling
        rows = table.find_all("tr")
        credits = []
        for row in rows:
            tds = row.find_all("td")
            name = ""
            credit = ""
            for td in tds:
                if not td.has_attr("class"): continue
                if td['class'][0] == "name":
                    name = td.text.strip()
                if td['class'][0] == 'credit':
                    credit = td.text.strip()
            if name == "": continue
            credits.append({
                "name": name,
                "credit": credit
            })
        return credits
    except Exception as e:
        return None


# def scrape_actor_works(actor_id_list):
#     imdb_actor_prefix = "https://www.imdb.com/name/"
#     count = 0
#     exceptions = []
#     for id in actor_id_list:
#         count += 1
#         print("{}/{}".format(count, len(actor_id_list)))
#         url = imdb_actor_prefix + id
#         response = requests.get(url)
#         try:
#             if response.status_code == 200:
#                 soup = BeautifulSoup(response.content, 'html.parser')
#                 filmography_container = soup.find("div", attrs={"id": "filmography"})
#                 if not filmography_container:
#                     exceptions.append({
#                         "id": id,
#                         "exception": "no filmography available"
#                     })
#                     continue
#                 top_casts = []
#                 max_candidates = 15
#                 candidate_num = 0
#                 for cast_row in filmography_container.children: 
#                     if cast_row == '\n': continue

#                     print(cast_row)
#                     return
#                     if candidate_num >= max_candidates: break
#                     # print(cast_row)
#                     # print("--------------")
#                     if cast_row.has_attr('class'):
#                         cast = {
#                             "rank": candidate_num + 1,
#                         }
#                         for info in cast_row.contents:
#                             if info == '\n': continue
#                             # image
#                             if info.has_attr("class") and info['class'][0] == 'primary_photo':
#                                 img_tag = info.find("img")
#                                 if img_tag is None:
#                                     img_src = "None"
#                                 else:
#                                     img_src = img_tag.get('src')
#                                 cast['img'] = img_src
#                             # actor name
#                             if not info.has_attr("class"):
#                                 a_tag = info.find("a")
#                                 if a_tag is None:
#                                     actor_name = "None"
#                                 else:
#                                     actor_name = a_tag.text.strip()
#                                 cast['name'] = actor_name
#                             # character name
#                             if info.has_attr("class") and info['class'][0] == 'character':
#                                 a_tag = info.find("a")
#                                 if a_tag is None:
#                                     character_name = "None"
#                                 else:
#                                     character_name = a_tag.text.strip()
#                                 cast['character'] = character_name
#                         top_casts.append(cast)
#                         candidate_num += 1
#                 movie_info = {
#                     "id": id,
#                     "top_casts": top_casts
#                 }
#                 save_json(movie_info, "movie_top_casts/" +id+".json")
#                 # movie_top_casts.append(movie_info)
#         except Exception as e:
#             exceptions.append({
#                 "id": id,
#                 "exception": "unknown exception"
#             })
#         save_json(exceptions, "movie_top_casts_exceptions.json")



def filter_movie(movie_id_dict, english_movie_ids):
    kept = []
    count = 0
    genre_set = set()
    filtered_genres = ['Game-Show', 'Reality-TV', '\\N']
    for movie_id in english_movie_ids:
        count += 1
        if count % 1000 == 0:
            print(count, "/", len(english_movie_ids))
        if movie_id not in movie_id_dict.keys(): continue 
        movie = movie_id_dict[movie_id]
        if movie['tconst'] not in english_movie_ids: continue
        year = movie['startYear']
        title = movie['titleType']
        time = movie['runtimeMinutes']
        genres = movie['genres']
        # filter constraints
        if not genres: continue
        genres = genres.split(",")
        if year < "1950": continue
        if title != "movie": continue
        if time < "90": continue
        genre_check = [genre for genre in genres if genre in filtered_genres]
        if genre_check: continue
        genre_set.update(genres)
        kept.append(movie)
    i = 0
    for kept_movie in kept:
        i += 1
        if i % 1000 == 0:
            print(kept_movie)

    print(len(kept))
    save_json(kept, r'kept.json')
    return kept
    # save_json(genre_dict, r"genre_dict.json")

def scrape_actor_works(actor_id_list):
    from contextlib import closing
    from selenium.webdriver import Firefox # pip install selenium
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support import expected_conditions as EC
    imdb_actor_prefix = "https://www.imdb.com/name/"
    count = 0
    exceptions = []
    for id in actor_id_list:
        count += 1
        print("{}/{}".format(count, len(actor_id_list)))
        url = imdb_actor_prefix + id
        print(url)
        # use firefox to get page with javascript generated content
        with closing(Firefox()) as driver:
            driver.get(url)
            headers = driver.find_elements(By.TAG_NAME, "h3")
            # credits = driver.find_element(By.XPATH, "//span[contains(text(), 'Credits')]")
            credits_found = False
            credit_span = None
            for header in headers:
                spans = header.find_elements(By.TAG_NAME, 'span')
                for span in spans:
                    if span.text == "Credits":
                        credit_span = span
                        credits_found = True
                        break
                if credits_found: break
            if not credits_found:
                print("credits not found")
                return
            print(credit_span)
            while(True):
                parent = credit_span.find_element(By.XPATH, "..")
                class_list = parent.get_attribute("class")
                print(class_list)
                if class_list == 'ipc-page-section': break

            return
            section_headers = filmography_container.find_elements("class", "head")
            click = False
            for header in section_headers:
                header_name = header.get_attribute("data-category")
                # don't need to click on first section
                if click:
                    header.click()
                else:
                    click = True
                # wait for the page to load
                WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.CLASS_NAME, "filmo-category-section"))
                )
                # store it to string variable
                page_source = driver.page_source

                soup = BeautifulSoup(page_source)
                expanded_section = soup.find("div", attrs={"class": "filmo-category-section"})
                for row in expanded_section.children:
                    film_id = row['id'].split('-')[1]
                    print(header_name, film_id)
                return

def add_artist_work_description(
    artist_works_dict_path=r'artist_works_dict.json', 
    artist_careers_path=r'careers/',
    movie_titles_path=r'titles.json',
):
    artist_dict = json.load(open(artist_works_dict_path))
    movie_list = json.load(open(movie_titles_path))
    movie_dict = {movie['id']: movie for movie in movie_list}
    count = 0

    artist_works_w_description_dict = defaultdict(list)
    for artist_id, works in artist_dict.items(): 
        count += 1
        artist_career_filepath = artist_careers_path + artist_id + "_career.json"
        try:
            career = json.load(open(artist_career_filepath))
        except:
            continue
        artist_works_w_description_dict[artist_id] = works
        for work in works:
            movie_id = work["id"]
            movie_title = movie_dict[movie_id]['title']
            work['wiki_description'] = []
            for section in career['career']:
                header = section['header']
                paragraphs = []
                for p, content in section.items():
                    if p == "header": continue
                    if movie_title.lower() in content.lower(): # alternative: only store sentences, not entire paragraph
                        paragraphs.append(content) 
                if len(paragraphs) != 0:
                    work['wiki_description'].append({"header": header, "paragraphs": paragraphs})
        print(artist_id, "{}/{}".format(count, len(artist_dict.keys())))
    
    save_json(artist_works_w_description_dict, r'artist_works_w_description.json')

main()



