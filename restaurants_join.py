import argparse
import csv
import json
import os

from algoliasearch import algoliasearch


ALGOLIA_APP_ID = os.environ['ALGOLIA_APP_ID']
ALGOLIA_API_KEY = os.environ['ALGOLIA_API_KEY']
INDEX_NAME = 'test_restaurants_000'


def load_csv(csv_file_name):
    with open(csv_file_name) as f:
        reader = csv.DictReader(f, delimiter=';')
        return {
            int(row['objectID']): {
                'food_type': row['food_type'],
                'starts_count': float(row['stars_count']),
                'reviews_count': int(row['reviews_count']),
                'neighborhood': row['neighborhood'],
                'phone_number': row['phone_number'],
                'price_range': row['price_range'],
                'dining_style': row['dining_style']
            }
            for row in reader
        }


def join_data(json_file_name, csv_data):
    with open(json_file_name) as f:
        data = json.load(f)
    all_data = []
    for j_object in data:
        if j_object['objectID'] in csv_data:
            j_object.update(csv_data[j_object['objectID']])
        all_data.append(j_object)
    with open('/tmp/reservation_joined.json', 'w') as f:
        json.dump(all_data, f)

#['AEJELR5460-1.algolianet.com', 'AEJELR5460-2.algolianet.com', 'AEJELR5460-3.algolianet.com', 'AEJELR5460.algolia.net']
# All hosts are unreachable
def batch_upload_data(joined_data, index):
    objects = []
    for object in joined_data:
        if len(objects) < 1000:
            objects.append(object)
            print object['phone'], object['phone_number']
        else:
            res = index.add_objects(objects)
            print res
            objects = [object]
    res = index.add_objects(objects)
    print res


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='reservation demo data joiner')
    parser.add_argument('--json-file', metavar='J', default='restaurants_list.json')
    parser.add_argument('--csv-file', metavar='C', default='restaurants_info.csv')

    args = parser.parse_args()
    client = algoliasearch.Client(ALGOLIA_APP_ID, ALGOLIA_API_KEY)
    client.timeout = (3000, 3000)
    index = client.init_index(INDEX_NAME)
    csv_data = load_csv(args.csv_file)
    join_data(args.json_file, csv_data)

