import * as d3 from "d3"

const track_index2name = ['actor', 'director', 'writer', 'producer']
interface Margin {
    top: number,
    bottom: number,
    left: number,
    right: number
}
export class TimelineConfig {
    width: number = 700  
	height: number = 600
	margin: Margin = {top: 20, right: 20, bottom: 20, left: 100}
    interval: number = 80
    xScale: any;
    tracks: any;
}
export class Timeline {
    svg: any;
    svgSelector: any;
    svgWidth: number;
    svgHeight: number;
    contentHeight: number;
    cfg: TimelineConfig;
    options: any;
    data: any;
    timeline_margin_top: number;
    yInterval: any;

    public constructor(svgSelector, options) {
        this.svgSelector = svgSelector 
        this.cfg = new TimelineConfig()
        this.options = options
        this.svgWidth = this.cfg.width
        this.svgHeight = this.cfg.height
        this.contentHeight = this.cfg.height
        this.timeline_margin_top = 100
    }

    init(data) {
        this.data = data
        this.svg = d3.select(this.svgSelector)
        // setup configs
        if('undefined' !== typeof this.options){
            for(var i in this.options) {
                if('undefined' !== typeof this.options[i]){ (this.cfg as any)[i] = this.options[i]; }
			}
		}
        // calculate height of the view from timeline length
        console.log(data)
        const timeline_length = data.reduce((total, step) => total + step.movies.length, 0)
        console.log("timeline length", timeline_length)
        const years = data.reduce((years, step)=> years.concat(step.movies.map(movie => +movie.year)), [])
        this.contentHeight = (Math.max(...years) - Math.min(...years) + 2) * (this.cfg.interval + this.cfg.interval/2)
        this.svgWidth = this.cfg.width + this.cfg.margin.left + this.cfg.margin.right
        this.svgHeight = this.contentHeight + this.cfg.margin.top + this.cfg.margin.bottom

        // setup scales
        this.cfg.xScale = d3.scaleBand()
                .domain(Object.keys(this.cfg.tracks))
                .range([0, this.cfg.width])
        this.yInterval = (year, start_year, index=0) => {
            return this.timeline_margin_top + (+year - start_year) * this.cfg.interval + index*this.cfg.interval/2
        }

        this.svg
            .attr("width",  this.svgWidth)
            .attr("height", this.svgHeight)
            .style("overflow", "visible")

		this.svg.append("g")
            .attr("class", "canvas")
            .attr("transform", "translate(" + (this.cfg.margin.left) + "," + (this.cfg.margin.top) + ")");

        this.setupTracks()
        console.log(count_movies(data, 1))
        // data = wrap_node(data)
        // data = JSON.parse(JSON.stringify(wrap_node(data)))
        // console.log(count_movies(data, 2))
        data = merge_by_year(this, data)
        // data = JSON.parse(JSON.stringify(merge_by_year(data)))
        // console.log(count_movies(data, 3))
        this.setupTimeline(data)

    }

    activate(index) {
        const active_stage_index: number = this.getSectionIndex(index)
        const text_sections = d3.selectAll(".section")
            .each(function(this: any) {
                if(+d3.select(this).attr("id").split("_")[1] == active_stage_index) {
                    this.classList.add("active")
                } else {
                    this.classList.remove("active")
                }
            })
        return
        const active_movies = this.data[index].movies
        let index_in_timeline = 0
        this.data.forEach((section, section_index) => {
            if(section_index >= index) return
            index_in_timeline += section.movies.length
        })
        const lines = this.svg.selectAll("line.connection")
            .each(function(this: any, d, i) {
                if(i >= index_in_timeline && i < index_in_timeline + active_movies.length - 1) {
                    d3.select(this).attr("opacity", 1)
                } else {
                    d3.select(this).attr("opacity", 0)
                }
            })
    }

    update(index, progress) {

    }

    setupTracks() {
        const canvas = this.svg.select("g.canvas")
        const track_names = Object.keys(this.cfg.tracks)
        const track_width = this.cfg.xScale.bandwidth()
        track_names.forEach((track_name, index) => {
            const track_color = this.cfg.tracks[track_name]
            canvas.append("rect")
                .attr("x", track_width * index)
                .attr("y", 0)
                .attr("width", track_width)
                .attr("height", this.contentHeight)
                .attr("fill", track_color)
        })
    }
    setupTimeline(data) {
        const canvas = this.svg.select("g.canvas")

        // TODO: fix multiple roles
        const sections_container = canvas.append("g").attr("class", "sections-container")
        // append sections
        const sections = sections_container.selectAll("g")
            .data(data)
            .join("g")
            .attr("class", "stage")
            .attr("id", (d, i) => `stage_${i}`)

        let self = this
        const start_year = +data[0].movies[0].year
        sections.each(function(this:any, d:any, stage_index) {
            const steps = d3.select(this).selectAll("g.step")
                .data(d.movies)
                .join("g")
                .attr("class", "step")
            steps.each(function(this: any, node_data: any) {
                const movie_data = node_data.movies || [node_data]
                const year = d3.select(this).selectAll("g.node")
                    .data(movie_data)
                    .style("cursor", "pointer")
                    .on("mouseover", function(this: any, e, d) {
                        this.classList.add("hovered")
                        d3.select(this).attr("fill", "white")
                        // TODO: animate hover effect in css

                    })
                    .on("mouseout", function(this: any, e, d) {
                        this.classList.remove("hovered")
                        d3.select(this).attr("fill", "black")
                    })
                const node = year.enter().append("g").attr("class", "node")
                node.each(function(movie_data: any) {
                    const genres = movie_data.genre.split(",")
                    const genre_length = genres.length
                    const icon_width = 30
                    const icon_height = 30
                    d3.select(this).selectAll("image.genre-icon")
                        .data(genres)
                        .join("image")
                        .attr("x", (d, i) => {
                            const node_center_x = movie_data.x
                            if(genre_length == 1) return node_center_x - icon_width/2
                            if(genre_length == 2) return node_center_x - icon_width + i*icon_width 
                            if(genre_length == 3) return node_center_x - icon_width + i*icon_width/2 
                            return node_center_x
                        })
                        .attr("y", (d, i) => {
                            const node_center_y = self.yInterval(+movie_data.year, start_year, stage_index) 
                            if(genre_length == 1) return node_center_y - icon_height/2
                            if(genre_length == 2) return node_center_y - icon_height/2
                            if(genre_length == 3) return node_center_y - icon_height/2 + ((i%2) == 0? 1 : -1)*Math.sqrt(3)/4*icon_width
                            return node_center_y
                        })
                        .attr("href", (d) => `${d}.svg`)
                        .attr("width", `${icon_width}px`)
                        .attr("height", `${icon_height}px`)
                })

                // titles
                console.log(movie_data)
                d3.select(this).append("text")
                    .attr("class", "titles")
                    .attr("x", self.getTitlePosition(movie_data[0].role))
                    .attr("y", self.yInterval(+movie_data[0].year, start_year, stage_index))
                    .text(movie_data.map(movie => movie.title).join(", "))
                    .style("pointer-events", "none")
                    .call(wrap, self.cfg.xScale.bandwidth()/2)

                // years
                d3.select(this).append("text")
                    .attr("class", "years")
                    .attr("x", -50)
                    .attr("y", self.yInterval(+movie_data[0].year, start_year, stage_index))
                    .text(movie_data[0].year + " - ")
                    .call(wrap, 100)

                // snippets
                const snippets = movie_data.map(movie => movie.snippet.map(snippet => snippet.snippet).join(" ") || "")
                d3.select(this).append("text")
                    .attr("class", "snippets")
                    .attr("x", self.getSnippetPosition(movie_data[0].role) + 30)
                    .attr("y", self.yInterval(+movie_data[0].year, start_year, stage_index))
                    .style("pointer-events", "none")
                    .text(snippets)
                    .call(wrap, self.getWrapWidth(movie_data[0].role))
            }) 
        })

        
        // append lines
        let line_data: any[] = []
        const timeline_movies = data.reduce((movies, step) => {
            step.movies.forEach(movie_node => {
                if(movie_node.type == "merged") {
                    movies = movies.concat(movie_node.movies)
                } else {
                    movies.push(movie_node)
                }
            })
            return movies
        }, [])
        console.log(timeline_movies)
        timeline_movies.forEach((step, index) => {
            if(index == timeline_movies.length - 1) return
            line_data.push({
                // d0: timeline_movies[Math.max(index - 1, 0)],
                d1: timeline_movies[index],
                d2: timeline_movies[index+1],
                // d3: timeline_movies[Math.min(index+2, timeline_movies.length-1)],
            })
        })

        // canvas.selectAll("line")
        //     .data(line_data)
        //     .join("line")
        //     .attr("class", "connection")
        //     .attr("x1", d => self.getTrackOffset(d.d1))
        //     .attr("x2", d => self.getTrackOffset(d.d2))
        //     .attr("y1", d => this.timeline_margin_top + (+d.d1.year - start_year) * this.cfg.interval)
        //     .attr("y2", d => this.timeline_margin_top + (+d.d2.year - start_year) * this.cfg.interval)
        //     .attr("stroke", "black")
        //     .style("pointer-events", "none")

        // const curve = d3.curveNatural()
        //     .x((d) => this.getTrackOffset(d))
        //     .y((d: any) => this.timeline_margin_top + (+d.year - start_year) * this.cfg.interval)
        //     // .curve(d3.curveMonotoneX);

        canvas.selectAll("path")
            .data(line_data)
            .join("path")
            .attr("class", "connection")
            .attr("d", (d, i) => {
                // const source_x = this.getTrackOffset(d.d1) 
                // const target_x = this.getTrackOffset(d.d2)
                const source_x = d.d1.x
                const target_x = d.d2.x
                // const source_y = this.timeline_margin_top + (+d.d1.year - start_year) * this.cfg.interval 
                // const target_y = this.timeline_margin_top + (+d.d2.year - start_year) * this.cfg.interval
                const source_y = this.yInterval(+d.d1.year, start_year, d.d1.stage)
                const target_y = this.yInterval(+d.d2.year, start_year, d.d2.stage)
                const dx = source_x - target_x
                const dy = Math.abs(source_y - target_y)
                const threshold = 5*this.cfg.interval
                if(source_x == target_x) {
                    if(Math.abs(dy) < threshold) {
                        return `M ${source_x} ${source_y} L ${target_x} ${target_y}`
                    }
                    else {
                        return `M ${source_x} ${source_y} L ${target_x} ${target_y}`
                        const interval_num = dy/this.cfg.interval
                        console.log("curving!", dy, this.cfg.interval, interval_num)
                        let dpath = `M ${source_x} ${source_y} `
                        Array.from({length: interval_num}, (x, i) => i).forEach(index => {
                            dpath += `Q ${source_x + (index%2 == 0? -1:1)*this.cfg.xScale.bandwidth()/2} ${source_y+(2*index+1)*this.cfg.interval/2} ${source_x} ${source_y+(index+1)*this.cfg.interval} `
                        })
                        dpath += `${target_x} ${target_y}`
                        return dpath
                    }

                } else {
                    return `M ${source_x} ${source_y} C ${source_x} ${target_y} ${target_x} ${source_y} ${target_x} ${target_y}`
                }
            })
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("fill", "none")
            .style("pointer-events", "none")
            // .attr("x1", d => self.getTrackOffset(d.d1))
            // .attr("x2", d => self.getTrackOffset(d.d2))
            // .attr("y1", d => this.timeline_margin_top + (+d.d1.year - start_year) * this.cfg.interval)
            // .attr("y2", d => this.timeline_margin_top + (+d.d2.year - start_year) * this.cfg.interval)
  
        // canvas.append("path")
        //   .attr("d", line(timeline_movies))
        //   .attr("fill", "none")
        //   .attr("stroke", "black");
    }

    getSectionIndex(index) {
        for(let section_index = 0; section_index < this.data.length; section_index++) {
            const section_length = this.data[section_index].movies.length
            index -= section_length
            if(index < 0) return section_index
        }
        return this.data.length - 1
    }

    getSectionOffset() {
        return [0, 1000, 2000]
    }
    
    getTitlePosition(roles) {
        const xTranslate = (roles) => this.cfg.xScale(prioritize_roles(roles))
        return xTranslate(roles) + 10
    }

    getSnippetPosition(roles) {
        const major_role = prioritize_roles(roles)
        if(major_role == "actor")  return this.cfg.xScale("producer") 
        if(major_role == "producer") return this.cfg.xScale("director") 
        if(major_role == "director") return this.cfg.xScale("actor") 
        if(major_role == "writer") return this.cfg.xScale("actor") 
        return this.cfg.xScale("producer") - this.cfg.xScale.bandwidth()/2
    }

    getWrapWidth(roles) {
        const major_role = prioritize_roles(roles)
        if(major_role == "actor")  return this.cfg.xScale.bandwidth()*2.5
        if(major_role == "producer") return this.cfg.xScale.bandwidth()*1.5
        if(major_role == "director") return this.cfg.xScale.bandwidth()*1.5
        if(major_role == "writer")  return this.cfg.xScale.bandwidth()*2.5
        return this.cfg.xScale.bandwidth()

    }

    getTrackOffset(d) {
        return this.cfg.xScale(prioritize_roles(d.role)) + this.cfg.xScale.bandwidth()/2 
    }

}
function wrap(text, width) {
    text.each(function (this: any, d, i) {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line: any[] = [],
            lineNumber = 0,
            lineHeight = 1.1, // ems
            x = text.attr("x"),
            y = text.attr("y"),
            dy = 0, //parseFloat(text.attr("dy")),
            tspan = text.text(null)
                .append("tspan")
                .attr("x", x)
                .attr("y", y)
                .attr("dy", dy + "em")
                .attr("text-anchor", "bottom")
                .attr("dominant-baseline", "central")
        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node()!.getComputedTextLength() > width && line.length > 1) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan")
                    .attr("x", x)
                    .attr("y", y)
                    .attr("dy", ++lineNumber * lineHeight + dy + "em")
                    .attr("dominant-baseline", "central")
                    .text(word);
            }
        }
        const line_num = text.selectAll("tspan").nodes().length
        const em_to_px = 16
        text.selectAll("tspan").attr("y", parseFloat(y) - em_to_px / 2 * lineHeight * (line_num - 1) / 2)
    });
}

function wrap_node(data) {
    // const cloned = JSON.parse(JSON.stringify(data));
    data.forEach((stage, stage_index) => {
        let wrapped_nodes: any[] = []
        let empty_movies: any[] = []
        let cur_role = ""
        stage.movies.forEach((movie, index) => {
            // console.log(movie, movie.snippet.length)
            const role = movie.role[1] || movie.role[0] 
            if(cur_role == "") cur_role = role
            if(movie.snippet.length != 0) {
                // create new empty node if empty_movies not empty
                if(empty_movies.length != 0) {
                    const empty_node = {
                        "type": "empty",
                        "title": "compact",
                        // "year": Math.round(empty_movies.reduce((a, b) => a + +b.year, 0) / empty_movies.length),
                        "year": empty_movies[0].year, 
                        "start_year": empty_movies[0].year,
                        "end_year": empty_movies[empty_movies.length - 1].year,
                        "role": [cur_role],
                        "movies": empty_movies
                    }
                    wrapped_nodes.push(empty_node)
                    empty_movies = []
                }
                wrapped_nodes.push(movie)
                return
            }
            if(movie.snippet.length == 0) {
                if(cur_role == role) {
                    empty_movies.push(movie)
                    return
                } else {
                    // create new empty node
                    const empty_node = {
                        "type": "empty",
                        "title": "compact",
                        "movies": empty_movies,
                        // "year": Math.round(empty_movies.reduce((a, b) => a + +b.year, 0) / empty_movies.length),
                        "year": empty_movies[0].year, 
                        "start_year": empty_movies[0].year,
                        "end_year": empty_movies[empty_movies.length - 1].year,
                        "role": [cur_role]
                    }
                    wrapped_nodes.push(empty_node)
                    empty_movies = []
                    cur_role = role
                    return
                }
            }
        })
        stage.movies = wrapped_nodes
    }) 
    console.log(data)
    return data
}

function merge_by_year(self, data) {
    data.forEach((stage) => {
        let res_movies: any[] = []
        const paragraph_list = stage.paragraphs
        let year_movies: any = []
        let cur_year = 0
        let cur_role = ""
        stage.movies.forEach((movie, index) => {
            const year = +movie.year
            const role = movie.role[1] || movie.role[0]
            if(cur_year == 0) cur_year = year
            if(cur_role == "") cur_role = role
            if(cur_year == year && role == cur_role) {
                year_movies.push(movie)
                return
            } else {
                if(year_movies.length == 1) {
                    year_movies[0].x = self.getTrackOffset(year_movies[0])
                    res_movies = res_movies.concat(year_movies)
                    year_movies = [movie]
                    cur_role = role
                    cur_year = year
                    return
                }
                res_movies.push(merge_movies(self, year_movies, cur_year, cur_role, paragraph_list))

                // reset everything
                cur_year = year
                cur_role = role
                year_movies = [movie]
            }
        })
        if(year_movies.length == 1) {
            year_movies[0].x = self.getTrackOffset(year_movies[0])
            res_movies = res_movies.concat(year_movies)
        } else if(year_movies.length > 1) {
            res_movies.push(merge_movies(self, year_movies, cur_year, cur_role, paragraph_list))
        }
        stage.movies = res_movies
    })
    console.log(data)
    return data
}

function merge_movies(self, movies, cur_year, cur_role, paragraph_list) {
    // merge movie snippets
    let target_paragraph_ids = new Set()
    // get paragraph ids
    movies.forEach(movie => {
        if(!movie.snippet || movie.snippet.length == 0) return
        movie.snippet.forEach(snippet => {
            target_paragraph_ids.add(snippet.p)
        })
    })
    let snippets = []
    if(target_paragraph_ids.size != 0) { 
        // get paragraph texts
        let target_paragraphs = paragraph_list.filter(p => target_paragraph_ids.has(Object.keys(p)[0]))
        target_paragraphs = target_paragraphs.map(paragraph => paragraph[Object.keys(paragraph)[0]])
        const sentences = target_paragraphs.join(" ").match( /[^\.!\?]+[\.!\?]+/g ).map(sentence => sentence.trim())
        snippets = filter_sentences(movies.map(movie => movie.title), sentences)
    }
    const offset = self.cfg.xScale.bandwidth() / (movies.length+1)
    movies.forEach((movie, i) => {
        movie.x =  self.getTrackOffset(movie) - self.cfg.xScale.bandwidth()/2 + (i+1) * offset
    })
    return {
        "type": "merged",
        "title": movies.map(movie => movie.title).join(", "),
        "movies": movies,
        "year": cur_year,
        "snippet": snippets.map(snippet => { 
            return {
                snippet: snippet
            }
        }),
        "role": [cur_role],
    }
}

function filter_sentences(target_titles, sentences) {
    return sentences.filter(sentence => {
        let flag = false
        target_titles.forEach(title => {
            if(sentence.includes(title)) {
                flag = true
                return
            }
        })
        return flag
    })
}

function count_movies(data, flag) {
    let count = 0
    if(flag == 1) {
        data.forEach(stage => {
            count += stage.movies.length
        })
    } 
    if(flag == 2) {
        data.forEach((stage, index) => {
            stage.movies.forEach(node => {
                if(node.type == "empty")
                    count += node.movies.length
                else
                    count += 1
            })
            console.log(`stage: ${index}, ${count}`)
        })
    }
    if(flag == 3) {
        data.forEach((stage, index) => {
            stage.movies.forEach(node => {
                if(node.type == "empty" || node.type == "merged")
                    count += node.movies.length
                else
                    count += 1
            })
            console.log(`stage: ${index}, ${count}`)
        })

    }
    return count
}

function prioritize_roles(roles) {
    if(roles.length == 1) return roles[0]
    else return roles.sort(compare_roles)[0]
}

function compare_roles(role1, role2) {
    const roles_priority = {
        "writer": 0,
        "producer": 1,
        "director": 2,
        "actor": 3,
    }
    return roles_priority[role1] - roles_priority[role2]
}
