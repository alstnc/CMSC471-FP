import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import json

df = pd.read_csv('/content/genre_relations.csv')

genres = df.iloc[:, 0].tolist()
genre_rank = pd.Series(
    data = np.arange(1, len(genres) + 1),
    index = genres,
    name  = "rank"
)

df2 = (
    df
    .rename(columns={df.columns[0]: "genre"})
    .set_index("genre")
)

# cosine similarity matrix
M = df2.fillna(0)
cosmat = pd.DataFrame(
    cosine_similarity(M),
    index=M.index, columns=M.index
)

genre_order = genre_rank.sort_values().index.tolist()
allowed = set(genre_order[:300]) # looking at top 300

roots = ["pop"]

# BFS
used_in_tree = set()
tree = {}
current_level = list(roots)

valid_roots = [r for r in roots if r in cosmat.index and r in allowed]
current_level = valid_roots

while current_level:
    next_level = []
    # process by popularity
    for node in sorted(current_level, key=lambda g: genre_rank.get(g, float('inf'))):
        if node not in used_in_tree:
            used_in_tree.add(node)

        if node not in cosmat.index:
            tree[node] = []
            continue

        sims = cosmat.loc[node].drop(labels=[node] + list(used_in_tree - {node}), errors="ignore").dropna()
        picks = [g for g in sims.nlargest(3).index if g in allowed]
        tree[node] = picks

        for p in picks:
            if p not in tree:
                 tree[p] = []
            if p not in used_in_tree:
                pass

            if p not in next_level and p not in current_level and p not in used_in_tree:
                 next_level.append(p)
    current_level = list(set(next_level))

bfs_ordered_nodes = []
if valid_roots and valid_roots[0] in tree or any(valid_roots[0] in children for children in tree.values()):
    queue = list(valid_roots)
    visited_for_bfs = set()
    head = 0
    while head < len(queue):
        current_bfs_node = queue[head]
        head += 1
        if current_bfs_node not in visited_for_bfs:
            visited_for_bfs.add(current_bfs_node)
            bfs_ordered_nodes.append(current_bfs_node)
            if current_bfs_node in tree: 
                for child in tree[current_bfs_node]:
                    if child not in visited_for_bfs:
                        queue.append(child)

    all_nodes_in_tree = set(tree.keys())
    for children_list in tree.values():
        for child in children_list:
            all_nodes_in_tree.add(child)
    
    final_bfs_ordered_nodes = [node for node in bfs_ordered_nodes if node in all_nodes_in_tree and node in allowed]
    
    for node in all_nodes_in_tree:
        if node in allowed and node not in final_bfs_ordered_nodes:
            final_bfs_ordered_nodes.append(node) 

all_graph_nodes = set(final_bfs_ordered_nodes)
for node_id in tree.keys():
    all_graph_nodes.add(node_id)
for children_list in tree.values():
    for child_id in children_list:
        all_graph_nodes.add(child_id)

genre_ranks_map = {
    genre: int(genre_rank.get(genre))
    for genre in all_graph_nodes if genre in genre_rank
}

for genre in all_graph_nodes:
    if genre not in genre_ranks_map:
        genre_ranks_map[genre] = -1

# json
output_data = {
    "nodes_bfs_order": final_bfs_ordered_nodes,
    "adjacency_list": tree,
    "genre_ranks": genre_ranks_map
}

json_file_path = 'music_genres_data.json'
with open(json_file_path, 'w') as json_file_obj:
  json.dump(output_data, json_file_obj, indent=4)